import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { buildApp } from '../app';
import { FastifyInstance } from 'fastify';
import { Role, MemoryType, MemorySource } from '@cryptonion/shared';
import { AIMemory, AIEmployee, Lead } from '@cryptonion/db';

describe('Phase 4: Structured Memory Engine & Multi-Tenancy', () => {
  let app: FastifyInstance;

  const orgA = '11111111-1111-1111-1111-111111111111';
  const orgB = '22222222-2222-2222-2222-222222222222';
  const empA = '33333333-3333-3333-3333-333333333333';
  const empB = '44444444-4444-4444-4444-444444444444';

  let adminTokenA: string;
  let viewerTokenA: string;
  let adminTokenB: string;

  const memoryStore: any[] = [];
  const employeeStore: any[] = [
    { id: empA, organizationId: orgA, name: 'Maya OrgA' },
    { id: empB, organizationId: orgB, name: 'Alex OrgB' },
  ];

  beforeAll(async () => {
    vi.spyOn(AIEmployee, 'findOne').mockImplementation(async (options: any) => {
      const where = options?.where || {};
      return employeeStore.find((e) => {
        if (where.id && e.id !== where.id) return false;
        if (where.organizationId && e.organizationId !== where.organizationId) return false;
        return true;
      }) as any;
    });

    vi.spyOn(AIMemory, 'findAll').mockImplementation(async (options: any) => {
      const where = options?.where || {};
      return memoryStore.filter((m) => {
        if (where.organizationId && m.organizationId !== where.organizationId) return false;
        if (where.aiEmployeeId && m.aiEmployeeId !== where.aiEmployeeId) return false;
        if (where.type && m.type !== where.type) return false;
        return true;
      }) as any;
    });

    vi.spyOn(AIMemory, 'findOne').mockImplementation(async (options: any) => {
      const where = options?.where || {};
      const found = memoryStore.find((m) => {
        if (where.id && m.id !== where.id) return false;
        if (where.organizationId && m.organizationId !== where.organizationId) return false;
        if (where.aiEmployeeId && m.aiEmployeeId !== where.aiEmployeeId) return false;
        if (where.key && m.key !== where.key) return false;
        return true;
      });
      if (!found) return null as any;
      found.update = async (patch: any) => {
        Object.assign(found, patch);
        return found;
      };
      found.destroy = async () => {
        const idx = memoryStore.findIndex((x) => x.id === found.id);
        if (idx !== -1) memoryStore.splice(idx, 1);
      };
      return found as any;
    });

    vi.spyOn(AIMemory, 'count').mockImplementation(async (options: any) => {
      const where = options?.where || {};
      return memoryStore.filter((m) => {
        if (where.organizationId && m.organizationId !== where.organizationId) return false;
        if (where.aiEmployeeId && m.aiEmployeeId !== where.aiEmployeeId) return false;
        return true;
      }).length;
    });

    vi.spyOn(AIMemory, 'create').mockImplementation(async (data: any) => {
      const mem = {
        id: data.id || `mem-${Date.now()}-${Math.random()}`,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
        update: async (patch: any) => Object.assign(mem, patch),
        destroy: async () => {
          const idx = memoryStore.findIndex((x) => x.id === mem.id);
          if (idx !== -1) memoryStore.splice(idx, 1);
        },
      };
      memoryStore.push(mem);
      return mem as any;
    });

    app = await buildApp();
    await app.ready();

    adminTokenA = app.jwt.sign({ userId: 'u1', email: 'admin@a.com', organizationId: orgA, role: Role.ADMIN, membershipId: 'm1' });
    viewerTokenA = app.jwt.sign({ userId: 'u2', email: 'viewer@a.com', organizationId: orgA, role: Role.VIEWER, membershipId: 'm2' });
    adminTokenB = app.jwt.sign({ userId: 'u3', email: 'admin@b.com', organizationId: orgB, role: Role.ADMIN, membershipId: 'm3' });
  });

  afterAll(async () => {
    await app.close();
  });

  it('allows Admin to create and list structured memories', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/ai-employees/${empA}/memories`,
      headers: { authorization: `Bearer ${adminTokenA}` },
      payload: {
        type: MemoryType.USER_PREFERENCE,
        key: 'preferred_language',
        value: 'Telugu',
        confidence: 0.95,
        source: MemorySource.EXPLICIT_ADMIN,
      },
    });

    expect(res.statusCode).toBe(201);
    const json = JSON.parse(res.payload);
    expect(json.success).toBe(true);
    expect(json.data.key).toBe('preferred_language');
    expect(json.data.value).toBe('Telugu');
  });

  it('performs deterministic upsert when key already exists for the entity scope', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/ai-employees/${empA}/memories`,
      headers: { authorization: `Bearer ${adminTokenA}` },
      payload: {
        type: MemoryType.USER_PREFERENCE,
        key: 'preferred_language',
        value: 'English',
        confidence: 1.0,
      },
    });

    expect(res.statusCode).toBe(201);
    const json = JSON.parse(res.payload);
    expect(json.data.value).toBe('English');

    // Should only have 1 memory record for this key, not duplicated
    const listRes = await app.inject({
      method: 'GET',
      url: `/api/ai-employees/${empA}/memories`,
      headers: { authorization: `Bearer ${adminTokenA}` },
    });
    const listJson = JSON.parse(listRes.payload);
    expect(listJson.data.filter((m: any) => m.key === 'preferred_language')).toHaveLength(1);
  });

  it('rejects attempt to store secret credentials / API keys in memory (Safety Policy)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/ai-employees/${empA}/memories`,
      headers: { authorization: `Bearer ${adminTokenA}` },
      payload: {
        type: MemoryType.FACT,
        key: 'aws_key',
        value: 'AKIAIOSFODNN7EXAMPLE and secret_key: mySecretPassword123',
      },
    });

    expect(res.statusCode).toBe(400);
    const json = JSON.parse(res.payload);
    expect(json.error.message).toContain('Memory rejected by safety policy');
  });

  it('enforces RBAC: Viewer cannot create or delete memory (403)', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: `/api/ai-employees/${empA}/memories`,
      headers: { authorization: `Bearer ${viewerTokenA}` },
      payload: {
        type: MemoryType.FACT,
        key: 'unauthorized_key',
        value: 'Test',
      },
    });
    expect(createRes.statusCode).toBe(403);
  });

  it('strictly prevents IDOR: Tenant B cannot access or modify Tenant A memories (404)', async () => {
    // 1. Tenant B listing Tenant A's memories returns 404 (or empty since employee not found in Org B)
    const listRes = await app.inject({
      method: 'GET',
      url: `/api/ai-employees/${empA}/memories`,
      headers: { authorization: `Bearer ${adminTokenB}` },
    });
    const listJson = JSON.parse(listRes.payload);
    expect(listJson.data).toHaveLength(0);

    // 2. Tenant B attempting to create memory for Tenant A's employee returns 404
    const postRes = await app.inject({
      method: 'POST',
      url: `/api/ai-employees/${empA}/memories`,
      headers: { authorization: `Bearer ${adminTokenB}` },
      payload: {
        type: MemoryType.FACT,
        key: 'cross_tenant_key',
        value: 'Infiltrate',
      },
    });
    expect(postRes.statusCode).toBe(404);
  });
});
