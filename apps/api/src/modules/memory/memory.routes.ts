import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  AIMemoryCreateSchema,
  AIMemoryUpdateSchema,
  Permission,
  MemoryType,
} from '@cryptonion/shared';
import { MemoryService } from './memory.service';

export default async function memoryRoutes(fastify: FastifyInstance) {
  const typedFastify = fastify.withTypeProvider<ZodTypeProvider>();

  // 1. List Memories for AI Employee
  typedFastify.get(
    '/api/ai-employees/:id/memories',
    {
      preHandler: [fastify.authenticate, fastify.requirePermission(Permission.MEMORY_READ)],
      schema: {
        tags: ['Memory & Context Engine'],
        summary: 'List structured memories for AI Employee',
        params: z.object({ id: z.string().uuid() }),
        querystring: z.object({
          leadId: z.string().uuid().optional(),
          type: z.nativeEnum(MemoryType).optional(),
        }),
      },
    },
    async (request, reply) => {
      const { organizationId } = request.user;
      const { id: aiEmployeeId } = request.params;
      const { leadId, type } = request.query;

      const memories = await MemoryService.listMemories(organizationId, aiEmployeeId, {
        leadId,
        type,
      });

      return reply.send({
        success: true,
        data: memories,
      });
    }
  );

  // 2. Create / Upsert Memory for AI Employee
  typedFastify.post(
    '/api/ai-employees/:id/memories',
    {
      preHandler: [fastify.authenticate, fastify.requirePermission(Permission.MEMORY_CREATE)],
      schema: {
        tags: ['Memory & Context Engine'],
        summary: 'Create or upsert structured memory',
        params: z.object({ id: z.string().uuid() }),
        body: AIMemoryCreateSchema,
      },
    },
    async (request, reply) => {
      const { organizationId } = request.user;
      const { id: aiEmployeeId } = request.params;

      try {
        const memory = await MemoryService.createMemory(organizationId, aiEmployeeId, request.body);

        return reply.status(201).send({
          success: true,
          data: memory,
        });
      } catch (err: any) {
        if (err.message === 'AI_EMPLOYEE_NOT_FOUND') {
          return reply.status(404).send({
            success: false,
            error: { code: 'NOT_FOUND', message: 'AI Employee not found in your organization' },
          });
        }
        if (err.message === 'LEAD_NOT_FOUND') {
          return reply.status(404).send({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Lead not found in your organization' },
          });
        }
        if (err.code === 'VALIDATION_FAILED') {
          return reply.status(400).send({
            success: false,
            error: { code: 'VALIDATION_FAILED', message: err.message },
          });
        }
        if (err.code === 'QUOTA_EXCEEDED') {
          return reply.status(400).send({
            success: false,
            error: { code: 'QUOTA_EXCEEDED', message: err.message },
          });
        }

        return reply.status(500).send({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: err.message },
        });
      }
    }
  );

  // 3. Update Memory
  typedFastify.patch(
    '/api/ai-employees/:id/memories/:memoryId',
    {
      preHandler: [fastify.authenticate, fastify.requirePermission(Permission.MEMORY_UPDATE)],
      schema: {
        tags: ['Memory & Context Engine'],
        summary: 'Update structured memory',
        params: z.object({
          id: z.string().uuid(),
          memoryId: z.string().uuid(),
        }),
        body: AIMemoryUpdateSchema,
      },
    },
    async (request, reply) => {
      const { organizationId } = request.user;
      const { id: aiEmployeeId, memoryId } = request.params;

      try {
        const updated = await MemoryService.updateMemory(organizationId, aiEmployeeId, memoryId, request.body);

        if (!updated) {
          return reply.status(404).send({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Memory record not found in your organization' },
          });
        }

        return reply.send({
          success: true,
          data: updated,
        });
      } catch (err: any) {
        if (err.code === 'VALIDATION_FAILED') {
          return reply.status(400).send({
            success: false,
            error: { code: 'VALIDATION_FAILED', message: err.message },
          });
        }

        return reply.status(500).send({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: err.message },
        });
      }
    }
  );

  // 4. Delete Memory
  typedFastify.delete(
    '/api/ai-employees/:id/memories/:memoryId',
    {
      preHandler: [fastify.authenticate, fastify.requirePermission(Permission.MEMORY_DELETE)],
      schema: {
        tags: ['Memory & Context Engine'],
        summary: 'Delete structured memory',
        params: z.object({
          id: z.string().uuid(),
          memoryId: z.string().uuid(),
        }),
      },
    },
    async (request, reply) => {
      const { organizationId } = request.user;
      const { id: aiEmployeeId, memoryId } = request.params;

      const deleted = await MemoryService.deleteMemory(organizationId, aiEmployeeId, memoryId);

      if (!deleted) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Memory record not found in your organization' },
        });
      }

      return reply.send({
        success: true,
        message: 'Memory deleted successfully',
      });
    }
  );
}
