import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { LeadCreateSchema, Role } from '@cryptonion/shared';
import { Lead, Campaign } from '@cryptonion/db';

export default async function leadRoutes(fastify: FastifyInstance) {
  const typedFastify = fastify.withTypeProvider<ZodTypeProvider>();

  // List Leads for Tenant
  typedFastify.get(
    '/api/leads',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Leads'],
        summary: 'List Organization Leads',
        querystring: z.object({
          campaignId: z.string().uuid().optional(),
          status: z.string().optional(),
        }),
      },
    },
    async (request, reply) => {
      const { organizationId } = request.user;
      const { campaignId, status } = request.query;

      const whereClause: any = { organizationId };
      if (campaignId) whereClause.campaignId = campaignId;
      if (status) whereClause.status = status;

      const leads = await Lead.findAll({
        where: whereClause,
        order: [['createdAt', 'DESC']],
        limit: 100,
      });

      return reply.send({
        success: true,
        data: leads,
      });
    }
  );

  // Create Lead (RBAC: Admin / Manager / Agent)
  typedFastify.post(
    '/api/leads',
    {
      preHandler: [fastify.requireRole([Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.AGENT])],
      schema: {
        tags: ['Leads'],
        summary: 'Create Single Lead (Agent+)',
        body: LeadCreateSchema,
      },
    },
    async (request, reply) => {
      const { organizationId } = request.user;
      const body = request.body;

      // IDOR check if campaignId is specified
      if (body.campaignId) {
        const campaign = await Campaign.findOne({
          where: { id: body.campaignId, organizationId },
        });
        if (!campaign) {
          return reply.status(404).send({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Campaign not found in your organization' },
          });
        }
      }

      const lead = await Lead.create({
        organizationId,
        firstName: body.firstName,
        lastName: body.lastName,
        phoneNumber: body.phoneNumber,
        email: body.email,
        campaignId: body.campaignId || null,
        status: body.status,
        customData: body.customData || {},
      });

      return reply.status(201).send({
        success: true,
        data: lead,
      });
    }
  );

  // Bulk Import Leads (RBAC: Admin / Manager / Agent)
  typedFastify.post(
    '/api/leads/bulk',
    {
      preHandler: [fastify.requireRole([Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.AGENT])],
      schema: {
        tags: ['Leads'],
        summary: 'Bulk Import Leads List (Agent+)',
        body: z.object({
          leads: z.array(LeadCreateSchema),
        }),
      },
    },
    async (request, reply) => {
      const { organizationId } = request.user;
      const { leads } = request.body;

      // Check all referenced campaigns belong to tenant
      const campaignIds = Array.from(new Set(leads.map((l) => l.campaignId).filter(Boolean))) as string[];
      if (campaignIds.length > 0) {
        const matchingCampaigns = await Campaign.findAll({
          where: { id: campaignIds, organizationId },
          attributes: ['id'],
        });
        if (matchingCampaigns.length !== campaignIds.length) {
          return reply.status(400).send({
            success: false,
            error: { code: 'INVALID_CAMPAIGNS', message: 'One or more campaigns do not belong to your organization' },
          });
        }
      }

      const records = leads.map((l) => ({
        ...l,
        organizationId,
        campaignId: l.campaignId || null,
        customData: l.customData || {},
      }));

      const created = await Lead.bulkCreate(records);

      return reply.status(201).send({
        success: true,
        data: {
          count: created.length,
          leads: created,
        },
      });
    }
  );
}
