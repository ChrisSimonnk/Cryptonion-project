import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { sequelize } from '@cryptonion/db';

export default async function healthRoutes(fastify: FastifyInstance) {
  const typedFastify = fastify.withTypeProvider<ZodTypeProvider>();

  typedFastify.get('/health', {
    schema: {
      tags: ['System'],
      summary: 'Service Health Check',
      description: 'Returns API, Database and environment health status',
      response: {
        200: z.object({
          status: z.string(),
          timestamp: z.string(),
          database: z.string(),
          version: z.string(),
        }),
      },
    },
    handler: async () => {
      let dbStatus = 'healthy';
      try {
        await sequelize.authenticate();
      } catch {
        dbStatus = 'unreachable';
      }

      return {
        status: dbStatus === 'healthy' ? 'ok' : 'degraded',
        timestamp: new Date().toISOString(),
        database: dbStatus,
        version: '1.0.0',
      };
    },
  });
}
