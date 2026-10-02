import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import crypto from 'crypto';
import { 
  Role, 
  Permission, 
  MembershipStatus, 
  InvitationStatus, 
  OrganizationCreateSchema, 
  OrganizationUpdateSchema,
  InviteMemberSchema,
  ChangeMemberRoleSchema
} from '@cryptonion/shared';
import { 
  Organization, 
  Membership, 
  User, 
  Invitation, 
  AuditLog, 
  sequelize 
} from '@cryptonion/db';

export default async function organizationRoutes(fastify: FastifyInstance) {
  const typedFastify = fastify.withTypeProvider<ZodTypeProvider>();

  // List all organizations the user belongs to
  typedFastify.get(
    '/api/organizations',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Organizations'],
        summary: 'List All Organizations for User',
      },
    },
    async (request, reply) => {
      const { userId } = request.user;
      const memberships = await Membership.findAll({
        where: { userId, status: MembershipStatus.ACTIVE },
        include: [{ model: Organization, as: 'organization' }],
        order: [['createdAt', 'ASC']],
      });

      const organizations = memberships.map((m: any) => ({
        organization: m.organization,
        role: m.role,
        status: m.status,
      }));

      return reply.send({
        success: true,
        data: organizations,
      });
    }
  );

  // Create New Organization (User becomes Owner / SUPER_ADMIN)
  typedFastify.post(
    '/api/organizations',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Organizations'],
        summary: 'Create New Organization Workspace',
        body: OrganizationCreateSchema,
      },
    },
    async (request, reply) => {
      const { userId } = request.user;
      const { name, slug: customSlug } = request.body;

      const slug = customSlug || name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.random().toString(36).substring(2, 6);

      const result = await sequelize.transaction(async (t) => {
        const organization = await Organization.create({
          name,
          slug,
          plan: 'starter',
          settings: {},
        }, { transaction: t });

        const membership = await Membership.create({
          userId,
          organizationId: organization.id,
          role: Role.SUPER_ADMIN,
          status: MembershipStatus.ACTIVE,
        }, { transaction: t });

        return { organization, membership };
      });

      // Audit organization creation
      await fastify.logAudit({
        organizationId: result.organization.id,
        userId,
        action: 'org.create',
        resourceType: 'organization',
        resourceId: result.organization.id,
        details: { name: result.organization.name, slug: result.organization.slug },
        request,
      });

      return reply.status(201).send({
        success: true,
        data: {
          organization: result.organization,
          membership: result.membership,
        },
      });
    }
  );

  // Get Current Active Organization
  typedFastify.get(
    '/api/organizations/current',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Organizations'],
        summary: 'Get Current Active Organization Details',
      },
    },
    async (request, reply) => {
      const { organizationId } = request.user;
      const organization = await Organization.findByPk(organizationId);

      if (!organization) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Organization not found' },
        });
      }

      return reply.send({
        success: true,
        data: organization,
      });
    }
  );

  // Update Current Organization (Requires Permission: org:update)
  typedFastify.put(
    '/api/organizations/current',
    {
      preHandler: [fastify.requirePermission(Permission.ORG_UPDATE)],
      schema: {
        tags: ['Organizations'],
        summary: 'Update Current Organization Details (org:update)',
        body: OrganizationUpdateSchema,
      },
    },
    async (request, reply) => {
      const { organizationId, userId } = request.user;
      const organization = await Organization.findByPk(organizationId);

      if (!organization) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Organization not found' },
        });
      }

      await organization.update(request.body);

      await fastify.logAudit({
        organizationId,
        userId,
        action: 'org.update',
        resourceType: 'organization',
        resourceId: organization.id,
        details: request.body,
        request,
      });

      return reply.send({
        success: true,
        data: organization,
      });
    }
  );

  // List Organization Members (Requires Permission: member:read)
  typedFastify.get(
    '/api/organizations/current/members',
    {
      preHandler: [fastify.requirePermission(Permission.MEMBER_READ)],
      schema: {
        tags: ['Memberships'],
        summary: 'List Organization Members (member:read)',
      },
    },
    async (request, reply) => {
      const { organizationId } = request.user;

      const memberships = await Membership.findAll({
        where: { organizationId },
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'email', 'name', 'avatarUrl', 'isActive', 'lastLoginAt', 'createdAt'],
        }],
        order: [['createdAt', 'ASC']],
      });

      return reply.send({
        success: true,
        data: memberships,
      });
    }
  );

  // Invite New Member (Requires Permission: member:create)
  typedFastify.post(
    '/api/organizations/current/invitations',
    {
      preHandler: [fastify.requirePermission(Permission.MEMBER_CREATE)],
      schema: {
        tags: ['Memberships'],
        summary: 'Invite User to Organization (member:create)',
        body: InviteMemberSchema,
      },
    },
    async (request, reply) => {
      const { organizationId, userId, role: callerRole } = request.user;
      const { email, role: targetRole } = request.body;

      // Role escalation guard: Only SUPER_ADMIN can invite other SUPER_ADMINs
      if (targetRole === Role.SUPER_ADMIN && callerRole !== Role.SUPER_ADMIN) {
        return reply.status(403).send({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Only an organization Owner can invite users with SUPER_ADMIN role' },
        });
      }

      // Check if user already has active membership
      const existingUser = await User.findOne({ where: { email: email.toLowerCase() } });
      if (existingUser) {
        const existingMembership = await Membership.findOne({
          where: { userId: existingUser.id, organizationId, status: MembershipStatus.ACTIVE },
        });
        if (existingMembership) {
          return reply.status(400).send({
            success: false,
            error: { code: 'ALREADY_MEMBER', message: 'User is already an active member of this organization' },
          });
        }
      }

      // Check for existing pending invitation
      const existingInvite = await Invitation.findOne({
        where: { organizationId, email: email.toLowerCase(), status: InvitationStatus.PENDING },
      });
      if (existingInvite) {
        return reply.status(400).send({
          success: false,
          error: { code: 'INVITE_PENDING', message: 'A pending invitation already exists for this email' },
        });
      }

      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days expiration

      const invitation = await Invitation.create({
        organizationId,
        email: email.toLowerCase(),
        role: targetRole,
        token,
        status: InvitationStatus.PENDING,
        expiresAt,
        invitedById: userId,
      });

      await fastify.logAudit({
        organizationId,
        userId,
        action: 'member.invite',
        resourceType: 'invitation',
        resourceId: invitation.id,
        details: { email: invitation.email, role: invitation.role },
        request,
      });

      return reply.status(201).send({
        success: true,
        data: invitation,
      });
    }
  );

  // List Pending Invitations (Requires Permission: member:read)
  typedFastify.get(
    '/api/organizations/current/invitations',
    {
      preHandler: [fastify.requirePermission(Permission.MEMBER_READ)],
      schema: {
        tags: ['Memberships'],
        summary: 'List Pending Invitations (member:read)',
      },
    },
    async (request, reply) => {
      const { organizationId } = request.user;
      const invitations = await Invitation.findAll({
        where: { organizationId, status: InvitationStatus.PENDING },
        order: [['createdAt', 'DESC']],
      });

      return reply.send({
        success: true,
        data: invitations,
      });
    }
  );

  // Accept Invitation by Token
  typedFastify.post(
    '/api/invitations/:token/accept',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Memberships'],
        summary: 'Accept Organization Invitation Token',
        params: z.object({ token: z.string() }),
      },
    },
    async (request, reply) => {
      const { token } = request.params;
      const { userId, email } = request.user;

      const invite = await Invitation.findOne({
        where: { token, status: InvitationStatus.PENDING },
      });

      if (!invite) {
        return reply.status(404).send({
          success: false,
          error: { code: 'INVALID_INVITATION', message: 'Invitation token is invalid or has already been used' },
        });
      }

      if (new Date() > invite.expiresAt) {
        await invite.update({ status: InvitationStatus.EXPIRED });
        return reply.status(400).send({
          success: false,
          error: { code: 'INVITATION_EXPIRED', message: 'This invitation has expired' },
        });
      }

      // Create or activate membership
      const membership = await sequelize.transaction(async (t) => {
        await invite.update({ status: InvitationStatus.ACCEPTED }, { transaction: t });

        const [mem] = await Membership.findOrCreate({
          where: { userId, organizationId: invite.organizationId },
          defaults: {
            userId,
            organizationId: invite.organizationId,
            role: invite.role,
            status: MembershipStatus.ACTIVE,
            invitedBy: invite.invitedById,
          },
          transaction: t,
        });

        if (mem.status !== MembershipStatus.ACTIVE) {
          await mem.update({ status: MembershipStatus.ACTIVE, role: invite.role }, { transaction: t });
        }

        return mem;
      });

      await fastify.logAudit({
        organizationId: invite.organizationId,
        userId,
        action: 'member.joined',
        resourceType: 'membership',
        resourceId: membership.id,
        details: { email, role: invite.role },
        request,
      });

      return reply.send({
        success: true,
        data: {
          message: 'Invitation accepted successfully',
          membership,
        },
      });
    }
  );

  // Change Member Role (Requires Permission: member:update)
  typedFastify.put(
    '/api/organizations/current/members/:id/role',
    {
      preHandler: [fastify.requirePermission(Permission.MEMBER_UPDATE)],
      schema: {
        tags: ['Memberships'],
        summary: 'Change Member Role (member:update)',
        params: z.object({ id: z.string().uuid() }),
        body: ChangeMemberRoleSchema,
      },
    },
    async (request, reply) => {
      const { organizationId, userId, role: callerRole } = request.user;
      const { id } = request.params;
      const { role: newRole } = request.body;

      const targetMembership = await Membership.findOne({
        where: { id, organizationId },
      });

      if (!targetMembership) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Member not found in this organization' },
        });
      }

      // Security Rule: User cannot change their own role
      if (targetMembership.userId === userId) {
        return reply.status(400).send({
          success: false,
          error: { code: 'SELF_ROLE_CHANGE', message: 'You cannot modify your own role' },
        });
      }

      // Security Rule: Only SUPER_ADMIN can assign SUPER_ADMIN role
      if (newRole === Role.SUPER_ADMIN && callerRole !== Role.SUPER_ADMIN) {
        return reply.status(403).send({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Only an organization Owner can promote users to SUPER_ADMIN' },
        });
      }

      // Security Rule: Prevent demoting the last SUPER_ADMIN
      if (targetMembership.role === Role.SUPER_ADMIN && newRole !== Role.SUPER_ADMIN) {
        const ownerCount = await Membership.count({
          where: { organizationId, role: Role.SUPER_ADMIN, status: MembershipStatus.ACTIVE },
        });
        if (ownerCount <= 1) {
          return reply.status(400).send({
            success: false,
            error: { code: 'LAST_OWNER_PROTECTION', message: 'Cannot demote the last remaining Owner of the organization' },
          });
        }
      }

      const oldRole = targetMembership.role;
      await targetMembership.update({ role: newRole });

      await fastify.logAudit({
        organizationId,
        userId,
        action: 'member.role_changed',
        resourceType: 'membership',
        resourceId: targetMembership.id,
        details: { targetUserId: targetMembership.userId, oldRole, newRole },
        request,
      });

      return reply.send({
        success: true,
        data: targetMembership,
      });
    }
  );

  // Remove Member from Organization (Requires Permission: member:remove)
  typedFastify.delete(
    '/api/organizations/current/members/:id',
    {
      preHandler: [fastify.requirePermission(Permission.MEMBER_REMOVE)],
      schema: {
        tags: ['Memberships'],
        summary: 'Remove Member from Organization (member:remove)',
        params: z.object({ id: z.string().uuid() }),
      },
    },
    async (request, reply) => {
      const { organizationId, userId } = request.user;
      const { id } = request.params;

      const targetMembership = await Membership.findOne({
        where: { id, organizationId },
      });

      if (!targetMembership) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Member not found in this organization' },
        });
      }

      // Security Rule: Cannot remove the last remaining SUPER_ADMIN
      if (targetMembership.role === Role.SUPER_ADMIN) {
        const ownerCount = await Membership.count({
          where: { organizationId, role: Role.SUPER_ADMIN, status: MembershipStatus.ACTIVE },
        });
        if (ownerCount <= 1) {
          return reply.status(400).send({
            success: false,
            error: { code: 'LAST_OWNER_PROTECTION', message: 'Cannot remove the last remaining Owner of the organization' },
          });
        }
      }

      await targetMembership.destroy();

      await fastify.logAudit({
        organizationId,
        userId,
        action: 'member.removed',
        resourceType: 'membership',
        resourceId: id,
        details: { removedUserId: targetMembership.userId, role: targetMembership.role },
        request,
      });

      return reply.send({
        success: true,
        data: { message: 'Member removed successfully' },
      });
    }
  );

  // Security & Identity Audit Logs (Requires Permission: audit:read)
  typedFastify.get(
    '/api/audit-logs',
    {
      preHandler: [fastify.requirePermission(Permission.AUDIT_READ)],
      schema: {
        tags: ['Audit Logs'],
        summary: 'List Security & Identity Audit Trail (audit:read)',
      },
    },
    async (request, reply) => {
      const { organizationId } = request.user;

      const logs = await AuditLog.findAll({
        where: { organizationId },
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'email', 'name'],
        }],
        order: [['createdAt', 'DESC']],
        limit: 100,
      });

      return reply.send({
        success: true,
        data: logs,
      });
    }
  );
}
