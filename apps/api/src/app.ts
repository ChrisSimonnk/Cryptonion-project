import Fastify, { FastifyServerOptions } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import sensible from '@fastify/sensible';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';

import swaggerPlugin from './plugins/swagger';
import authPlugin from './plugins/auth';
import socketPlugin from './plugins/socket';

import healthRoutes from './modules/health/health.routes';
import authRoutes from './modules/auth/auth.routes';
import organizationRoutes from './modules/organizations/organizations.routes';
import aiEmployeeRoutes from './modules/ai-employees/ai-employees.routes';
import leadRoutes from './modules/leads/leads.routes';
import campaignRoutes from './modules/campaigns/campaigns.routes';
import callRoutes from './modules/calls/calls.routes';
import knowledgeRoutes from './modules/knowledge/knowledge.routes';
import memoryRoutes from './modules/memory/memory.routes';
import conversationRoutes from './modules/conversations/conversations.routes';

export async function buildApp(opts: FastifyServerOptions = {}) {
  const isTest = process.env.NODE_ENV === 'test';

  const app = Fastify({
    logger: opts.logger ?? (isTest ? false : { level: 'info' }),
    ...opts,
  });

  // Set Type Provider Zod Compilers
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // Security & Core Middleware Plugins
  await app.register(cors, {
    origin: '*',
    credentials: true,
  });

  await app.register(helmet, {
    contentSecurityPolicy: false,
  });

  await app.register(sensible);
  await app.register(multipart, {
    limits: {
      fileSize: 25 * 1024 * 1024,
    },
  });

  // Custom Infrastructure Plugins
  await app.register(swaggerPlugin);
  await app.register(authPlugin);
  await app.register(socketPlugin);

  // Register API Domain Modules
  await app.register(healthRoutes);
  await app.register(authRoutes);
  await app.register(organizationRoutes);
  await app.register(aiEmployeeRoutes);
  await app.register(leadRoutes);
  await app.register(campaignRoutes);
  await app.register(callRoutes);
  await app.register(knowledgeRoutes);
  await app.register(memoryRoutes);
  await app.register(conversationRoutes);

  return app;
}
