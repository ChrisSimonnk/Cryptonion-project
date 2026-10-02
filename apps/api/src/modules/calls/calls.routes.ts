import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { CallInitiateSchema, CallStatus, CallDirection, Role } from '@cryptonion/shared';
import { Call, AIEmployee, Lead, Campaign, Conversation, Message } from '@cryptonion/db';

export default async function callRoutes(fastify: FastifyInstance) {
  const typedFastify = fastify.withTypeProvider<ZodTypeProvider>();

  // List Calls with filter
  typedFastify.get(
    '/api/calls',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Calls & Telephony'],
        summary: 'List Calls History',
        querystring: z.object({
          status: z.string().optional(),
          aiEmployeeId: z.string().uuid().optional(),
        }),
      },
    },
    async (request, reply) => {
      const { organizationId } = request.user;
      const { status, aiEmployeeId } = request.query;

      const whereClause: any = { organizationId };
      if (status) whereClause.status = status;
      if (aiEmployeeId) whereClause.aiEmployeeId = aiEmployeeId;

      const calls = await Call.findAll({
        where: whereClause,
        include: [
          { model: AIEmployee, as: 'aiEmployee', attributes: ['id', 'name', 'role', 'avatarUrl'] },
          { model: Lead, as: 'lead', attributes: ['id', 'firstName', 'lastName', 'phoneNumber'] },
        ],
        order: [['createdAt', 'DESC']],
        limit: 100,
      });

      return reply.send({
        success: true,
        data: calls,
      });
    }
  );

  // Get Call Details & Live Transcript
  typedFastify.get(
    '/api/calls/:id',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Calls & Telephony'],
        summary: 'Get Call Timeline & Conversation Transcript',
        params: z.object({ id: z.string().uuid() }),
      },
    },
    async (request, reply) => {
      const { organizationId } = request.user;
      const { id } = request.params;

      const call = await Call.findOne({
        where: { id, organizationId },
        include: [
          { model: AIEmployee, as: 'aiEmployee' },
          { model: Lead, as: 'lead' },
          {
            model: Conversation,
            as: 'conversation',
            include: [{ model: Message, as: 'messages', separate: true, order: [['createdAt', 'ASC']] }],
          },
        ],
      });

      if (!call) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Call record not found in your organization' },
        });
      }

      return reply.send({
        success: true,
        data: call,
      });
    }
  );

  // Initiate Outbound Call (RBAC: Admin / Manager / Agent, with IDOR verification)
  typedFastify.post(
    '/api/calls/initiate',
    {
      preHandler: [fastify.requireRole([Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.AGENT])],
      schema: {
        tags: ['Calls & Telephony'],
        summary: 'Initiate Outbound Call session (Agent+)',
        body: CallInitiateSchema,
      },
    },
    async (request, reply) => {
      const { organizationId } = request.user;
      const { aiEmployeeId, calleeNumber, leadId, campaignId, direction } = request.body;

      // IDOR Verification 1: AI Employee belongs to tenant
      const employee = await AIEmployee.findOne({ where: { id: aiEmployeeId, organizationId } });
      if (!employee) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'AI Employee not found in your organization' },
        });
      }

      // IDOR Verification 2: Lead belongs to tenant if specified
      if (leadId) {
        const lead = await Lead.findOne({ where: { id: leadId, organizationId } });
        if (!lead) {
          return reply.status(404).send({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Lead not found in your organization' },
          });
        }
      }

      // IDOR Verification 3: Campaign belongs to tenant if specified
      if (campaignId) {
        const campaign = await Campaign.findOne({ where: { id: campaignId, organizationId } });
        if (!campaign) {
          return reply.status(404).send({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Campaign not found in your organization' },
          });
        }
      }

      const call = await Call.create({
        organizationId,
        aiEmployeeId,
        leadId: leadId || null,
        campaignId: campaignId || null,
        direction: direction || CallDirection.OUTBOUND,
        status: CallStatus.INITIATED,
        callerNumber: employee.phoneNumber || '+18005550199',
        calleeNumber,
        durationSeconds: 0,
        startedAt: new Date(),
        metadata: {},
      });

      // Create conversation container
      const conversation = await Conversation.create({
        organizationId,
        callId: call.id,
        aiEmployeeId,
        leadId: leadId || null,
        channel: 'voice',
        context: {},
      });

      // Broadcast call initiation securely to tenant room via Socket.IO
      fastify.io.to(`org:${organizationId}`).emit('call.initiated', {
        callId: call.id,
        aiEmployeeId,
        calleeNumber,
        status: CallStatus.INITIATED,
      });

      return reply.status(201).send({
        success: true,
        data: {
          call,
          conversationId: conversation.id,
        },
      });
    }
  );
}
