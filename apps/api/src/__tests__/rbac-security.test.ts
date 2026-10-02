import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../app';
import { FastifyInstance } from 'fastify';
import { Role } from '@cryptonion/shared';

describe('Fastify API Security & RBAC Enforcement', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('GET /health returns 200 OK without authentication', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBeDefined();
  });

  it('rejects unauthenticated access to protected /api/ai-employees with 401', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/ai-employees',
    });

    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('blocks VIEWER role from creating AI Employee with 403 Forbidden (RBAC Enforcement)', async () => {
    // Generate a token with VIEWER role
    const viewerToken = app.jwt.sign({
      userId: '123e4567-e89b-12d3-a456-426614174001',
      email: 'viewer@tenant.ai',
      organizationId: '123e4567-e89b-12d3-a456-426614174099',
      membershipId: 'mem-viewer-1',
      role: Role.VIEWER,
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/ai-employees',
      headers: {
        authorization: `Bearer ${viewerToken}`,
      },
      payload: {
        name: 'Unauthorized Agent',
        role: 'SALES_REP',
        llmConfig: {
          provider: 'ollama',
          model: 'llama3:8b',
          temperature: 0.7,
          maxTokens: 512,
          systemPrompt: 'Unauthorized prompt directive.',
        },
      },
    });

    expect(res.statusCode).toBe(403);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('FORBIDDEN');
    expect(body.error.message).toContain('VIEWER');
  });

  it('allows SUPER_ADMIN role past the RBAC guard', async () => {
    const adminToken = app.jwt.sign({
      userId: '123e4567-e89b-12d3-a456-426614174002',
      email: 'admin@tenant.ai',
      organizationId: '123e4567-e89b-12d3-a456-426614174099',
      membershipId: 'mem-admin-1',
      role: Role.SUPER_ADMIN,
    });

    // Test GET /api/ai-employees with valid token
    const res = await app.inject({
      method: 'GET',
      url: '/api/ai-employees',
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    });

    // Should not return 401 or 403
    expect(res.statusCode).not.toBe(401);
    expect(res.statusCode).not.toBe(403);
  });
});
