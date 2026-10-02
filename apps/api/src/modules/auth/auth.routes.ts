import { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { 
  UserRegisterSchema, 
  UserLoginSchema, 
  SwitchOrganizationSchema, 
  Role, 
  MembershipStatus,
  ROLE_PERMISSIONS
} from '@cryptonion/shared';
import { User, Organization, Membership, sequelize } from '@cryptonion/db';

export default async function authRoutes(fastify: FastifyInstance) {
  const typedFastify = fastify.withTypeProvider<ZodTypeProvider>();

  // Register New User + Default Organization (Creator is Owner / SUPER_ADMIN)
  typedFastify.post(
    '/api/auth/register',
    {
      schema: {
        tags: ['Authentication'],
        summary: 'Register User and Create Workspace Organization',
        body: UserRegisterSchema,
      },
    },
    async (request, reply) => {
      const { email, password, name, organizationName } = request.body;

      const existingUser = await User.findOne({ where: { email: email.toLowerCase() } });
      if (existingUser) {
        return reply.status(400).send({
          success: false,
          error: { code: 'USER_EXISTS', message: 'User with this email already exists' },
        });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const slug = organizationName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.random().toString(36).substring(2, 6);

      const result = await sequelize.transaction(async (t) => {
        const user = await User.create({
          email: email.toLowerCase(),
          passwordHash,
          name,
          isActive: true,
          lastLoginAt: new Date(),
        }, { transaction: t });

        const organization = await Organization.create({
          name: organizationName,
          slug,
          plan: 'starter',
          settings: {},
        }, { transaction: t });

        const membership = await Membership.create({
          userId: user.id,
          organizationId: organization.id,
          role: Role.SUPER_ADMIN,
          status: MembershipStatus.ACTIVE,
        }, { transaction: t });

        return { user, organization, membership };
      });

      // Audit logs for user registration and workspace creation
      await fastify.logAudit({
        organizationId: result.organization.id,
        userId: result.user.id,
        action: 'auth.register',
        resourceType: 'user',
        resourceId: result.user.id,
        details: { email: result.user.email, organizationId: result.organization.id },
        request,
      });

      const token = fastify.jwt.sign({
        userId: result.user.id,
        email: result.user.email,
        organizationId: result.organization.id,
        membershipId: result.membership.id,
        role: result.membership.role,
      });

      return reply.status(201).send({
        success: true,
        data: {
          token,
          user: {
            id: result.user.id,
            email: result.user.email,
            name: result.user.name,
            isActive: result.user.isActive,
          },
          organization: {
            id: result.organization.id,
            name: result.organization.name,
            slug: result.organization.slug,
            plan: result.organization.plan,
          },
          membership: {
            id: result.membership.id,
            role: result.membership.role,
            status: result.membership.status,
          },
          role: result.membership.role,
          permissions: ROLE_PERMISSIONS[result.membership.role] || [],
        },
      });
    }
  );

  // Login User
  typedFastify.post(
    '/api/auth/login',
    {
      schema: {
        tags: ['Authentication'],
        summary: 'User Login & Issue Tenant JWT',
        body: UserLoginSchema,
      },
    },
    async (request, reply) => {
      const { email, password } = request.body;

      const user = await User.findOne({ where: { email: email.toLowerCase() } });
      if (!user) {
        return reply.status(401).send({
          success: false,
          error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
        });
      }

      if (!user.isActive) {
        return reply.status(403).send({
          success: false,
          error: { code: 'ACCOUNT_DISABLED', message: 'Your account has been deactivated. Please contact support.' },
        });
      }

      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        return reply.status(401).send({
          success: false,
          error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
        });
      }

      // Find primary active organization membership
      const membership = await Membership.findOne({
        where: { userId: user.id, status: MembershipStatus.ACTIVE },
        include: [{ model: Organization, as: 'organization' }],
        order: [['createdAt', 'ASC']],
      });

      if (!membership) {
        return reply.status(403).send({
          success: false,
          error: { code: 'NO_ACTIVE_MEMBERSHIP', message: 'User does not belong to any active organization' },
        });
      }

      const org = (membership as any).organization;

      // Update last login timestamp
      await user.update({ lastLoginAt: new Date() });

      // Audit login
      await fastify.logAudit({
        organizationId: org.id,
        userId: user.id,
        action: 'auth.login',
        resourceType: 'user',
        resourceId: user.id,
        request,
      });

      const token = fastify.jwt.sign({
        userId: user.id,
        email: user.email,
        organizationId: org.id,
        membershipId: membership.id,
        role: membership.role,
      });

      return reply.send({
        success: true,
        data: {
          token,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            isActive: user.isActive,
          },
          organization: {
            id: org.id,
            name: org.name,
            slug: org.slug,
            plan: org.plan,
          },
          membership: {
            id: membership.id,
            role: membership.role,
            status: membership.status,
          },
          role: membership.role,
          permissions: ROLE_PERMISSIONS[membership.role] || [],
        },
      });
    }
  );

  // Switch Active Organization Context
  typedFastify.post(
    '/api/auth/switch-org',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Authentication'],
        summary: 'Switch Active Organization Tenant Context',
        body: SwitchOrganizationSchema,
      },
    },
    async (request, reply) => {
      const { organizationId } = request.body;
      const { userId, email } = request.user;

      // Server-side verification: User must have an active membership in target organization
      const targetMembership = await Membership.findOne({
        where: {
          userId,
          organizationId,
          status: MembershipStatus.ACTIVE,
        },
        include: [{ model: Organization, as: 'organization' }],
      });

      if (!targetMembership) {
        return reply.status(403).send({
          success: false,
          error: {
            code: 'FORBIDDEN_ORGANIZATION',
            message: 'You do not have an active membership in the target organization',
          },
        });
      }

      const org = (targetMembership as any).organization;

      // Audit context switch
      await fastify.logAudit({
        organizationId: org.id,
        userId,
        action: 'auth.switch_org',
        resourceType: 'organization',
        resourceId: org.id,
        details: { switchedFrom: request.user.organizationId, switchedTo: org.id },
        request,
      });

      // Issue new JWT token scoped strictly to target tenant
      const token = fastify.jwt.sign({
        userId,
        email,
        organizationId: org.id,
        membershipId: targetMembership.id,
        role: targetMembership.role,
      });

      return reply.send({
        success: true,
        data: {
          token,
          organization: {
            id: org.id,
            name: org.name,
            slug: org.slug,
            plan: org.plan,
          },
          membership: {
            id: targetMembership.id,
            role: targetMembership.role,
            status: targetMembership.status,
          },
          role: targetMembership.role,
          permissions: ROLE_PERMISSIONS[targetMembership.role] || [],
        },
      });
    }
  );

  // Logout / Terminate Session
  typedFastify.post(
    '/api/auth/logout',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Authentication'],
        summary: 'Logout and Invalidate Client Session',
      },
    },
    async (request, reply) => {
      await fastify.logAudit({
        organizationId: request.user.organizationId,
        userId: request.user.userId,
        action: 'auth.logout',
        resourceType: 'user',
        resourceId: request.user.userId,
        request,
      });

      return reply.send({
        success: true,
        data: { message: 'Logged out successfully' },
      });
    }
  );

  // Current Profile / Full Multi-Tenant Session Context
  typedFastify.get(
    '/api/auth/me',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Authentication'],
        summary: 'Get Current Authenticated User & Multi-Tenant Context',
      },
    },
    async (request, reply) => {
      const { userId, organizationId, role, membershipId } = request.user;
      const user = await User.findByPk(userId, { attributes: { exclude: ['passwordHash'] } });
      const currentOrg = await Organization.findByPk(organizationId);

      if (!user || !currentOrg) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Session entities not found' },
        });
      }

      // Fetch all organizations the user belongs to
      const allMemberships = await Membership.findAll({
        where: { userId, status: MembershipStatus.ACTIVE },
        include: [{ model: Organization, as: 'organization' }],
      });

      const availableOrganizations = allMemberships.map((m: any) => ({
        organization: {
          id: m.organization.id,
          name: m.organization.name,
          slug: m.organization.slug,
          plan: m.organization.plan,
          createdAt: m.organization.createdAt,
          updatedAt: m.organization.updatedAt,
        },
        role: m.role,
      }));

      return reply.send({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            avatarUrl: user.avatarUrl,
            isActive: user.isActive,
            lastLoginAt: user.lastLoginAt,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
          },
          organization: {
            id: currentOrg.id,
            name: currentOrg.name,
            slug: currentOrg.slug,
            plan: currentOrg.plan,
            settings: currentOrg.settings,
            createdAt: currentOrg.createdAt,
            updatedAt: currentOrg.updatedAt,
          },
          membership: {
            id: membershipId,
            userId,
            organizationId,
            role,
            status: MembershipStatus.ACTIVE,
            createdAt: user.createdAt,
          },
          role,
          permissions: ROLE_PERMISSIONS[role] || [],
          availableOrganizations,
        },
      });
    }
  );
}
