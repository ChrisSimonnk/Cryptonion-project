import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { CampaignCreateSchema, CampaignStatus, Role } from '@cryptonion/shared';
import { Campaign, AIEmployee, Lead } from '@cryptonion/db';

export default async function campaignRoutes(fastify: FastifyInstance) {
  const typedFastify = fastify.withTypeProvider<ZodTypeProvider>();

  // List Campaigns
  typedFastify.get(
    '/api/campaigns',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Campaigns'],
        summary: 'List Outreach Campaigns',
      },
    },
    async (request, reply) => {
      const { organizationId } = request.user;
      const campaigns = await Campaign.findAll({
        where: { organizationId },
        include: [{ model: AIEmployee, as: 'aiEmployee', attributes: ['id', 'name', 'role'] }],
        order: [['createdAt', 'DESC']],
      });

      return reply.send({
        success: true,
        data: campaigns,
      });
    }
  );

  // Create Campaign (RBAC: Admin / Manager, with IDOR verification)
  typedFastify.post(
    '/api/campaigns',
    {
      preHandler: [fastify.requireRole([Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER])],
      schema: {
        tags: ['Campaigns'],
        summary: 'Create Outreach Campaign (Admin/Manager)',
        body: CampaignCreateSchema,
      },
    },
    async (request, reply) => {
      const { organizationId } = request.user;
      const { aiEmployeeId, name, description, scheduledAt, leadIds } = request.body;

      // IDOR Verification: Ensure AI Employee belongs to tenant
      const employee = await AIEmployee.findOne({
        where: { id: aiEmployeeId, organizationId },
      });
      if (!employee) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Assigned AI Employee not found in your organization' },
        });
      }

      // IDOR Verification: Ensure all passed leadIds belong to tenant
      let validLeadsCount = 0;
      if (leadIds && leadIds.length > 0) {
        const matchingLeads = await Lead.findAll({
          where: { id: leadIds, organizationId },
          attributes: ['id'],
        });
        if (matchingLeads.length !== leadIds.length) {
          return reply.status(400).send({
            success: false,
            error: { code: 'INVALID_LEADS', message: 'One or more leads do not belong to your organization' },
          });
        }
        validLeadsCount = matchingLeads.length;
      }

      const campaign = await Campaign.create({
        organizationId,
        aiEmployeeId,
        name,
        description,
        status: CampaignStatus.DRAFT,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        totalLeads: validLeadsCount,
        contactedLeads: 0,
        successfulCalls: 0,
      });

      if (leadIds && leadIds.length > 0) {
        await Lead.update(
          { campaignId: campaign.id },
          { where: { id: leadIds, organizationId } }
        );
      }

      return reply.status(201).send({
        success: true,
        data: campaign,
      });
    }
  );

  // Trigger Campaign Launch (RBAC: Admin / Manager)
  typedFastify.post(
    '/api/campaigns/:id/start',
    {
      preHandler: [fastify.requireRole([Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER])],
      schema: {
        tags: ['Campaigns'],
        summary: 'Start Campaign Dialing Pipeline (Admin/Manager)',
        params: z.object({ id: z.string().uuid() }),
      },
    },
    async (request, reply) => {
      const { organizationId } = request.user;
      const { id } = request.params;

      const campaign = await Campaign.findOne({ where: { id, organizationId } });
      if (!campaign) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Campaign not found' },
        });
      }

      await campaign.update({ status: CampaignStatus.RUNNING });

      // Notify realtime connected clients in tenant room
      fastify.io.to(`org:${organizationId}`).emit('campaign.started', {
        campaignId: campaign.id,
        name: campaign.name,
      });

      return reply.send({
        success: true,
        data: campaign,
      });
    }
  );
}
