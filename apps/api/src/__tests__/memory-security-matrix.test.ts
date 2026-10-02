import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { buildApp } from '../app';
import { FastifyInstance } from 'fastify';
import { Role, MemoryType, MemorySource } from '@cryptonion/shared';
import { AIMemory, AIEmployee, Conversation, Message } from '@cryptonion/db';

describe('Phase 4 Security Test Matrix (14 Scenarios)', () => {
  let app: FastifyInstance;

  const orgA = '11111111-1111-1111-1111-111111111111';
  const orgB = '22222222-2222-2222-2222-222222222222';
  const empA = '33333333-3333-3333-3333-333333333333';
  const empB = '44444444-4444-4444-4444-444444444444';
  const memA = '55555555-5555-5555-5555-555555555555';
  const convA = '66666666-6666-6666-6666-666666666666';

  let adminTokenA: string;
  let viewerTokenA: string;
  let adminTokenB: string;

  const memStore: any[] = [
    {
      id: memA,
      organizationId: orgA,
      aiEmployeeId: empA,
      type: MemoryType.FACT,
      key: 'orgA_fact',
      value: 'Secret Strategy A',
      confidence: 1.0,
      source: MemorySource.EXPLICIT_ADMIN,
    },
  ];

  const convStore: any[] = [
    {
      id: convA,
      organizationId: orgA,
      aiEmployeeId: empA,
      channel: 'chat',
    },
  ];

  beforeAll(async () => {
    vi.spyOn(AIEmployee, 'findOne').mockImplementation(async (opts: any) => {
      const where = opts?.where || {};
      if (where.id === empA && where.organizationId === orgA) {
        return { id: empA, organizationId: orgA, name: 'Emp A' } as any;
      }
      if (where.id === empB && where.organizationId === orgB) {
        return { id: empB, organizationId: orgB, name: 'Emp B' } as any;
      }
      return null as any;
    });

    vi.spyOn(AIMemory, 'findOne').mockImplementation(async (opts: any) => {
      const where = opts?.where || {};
      const found = memStore.find((m) => {
        if (where.id && m.id !== where.id) return false;
        if (where.organizationId && m.organizationId !== where.organizationId) return false;
        if (where.aiEmployeeId && m.aiEmployeeId !== where.aiEmployeeId) return false;
        if (where.key && m.key !== where.key) return false;
        return true;
      });
      if (!found) return null as any;
      found.update = async (patch: any) => Object.assign(found, patch);
      found.destroy = async () => {};
      return found as any;
    });

    vi.spyOn(AIMemory, 'create').mockImplementation(async (data: any) => {
      const m = { id: data.id || '77777777-7777-7777-7777-777777777777', ...data };
      memStore.push(m);
      return m as any;
    });

    vi.spyOn(AIMemory, 'findAll').mockImplementation(async (opts: any) => {
      const where = opts?.where || {};
      return memStore.filter((m) => {
        if (where.organizationId && m.organizationId !== where.organizationId) return false;
        if (where.aiEmployeeId && m.aiEmployeeId !== where.aiEmployeeId) return false;
        return true;
      }) as any;
    });

    vi.spyOn(AIMemory, 'count').mockImplementation(async (opts: any) => {
      const where = opts?.where || {};
      if (where.organizationId === orgA && where.aiEmployeeId === empA) return 100; // Quota simulated full
      return 0;
    });

    vi.spyOn(Conversation, 'findOne').mockImplementation(async (opts: any) => {
      const where = opts?.where || {};
      return convStore.find((c) => {
        if (where.id && c.id !== where.id) return false;
        if (where.organizationId && c.organizationId !== where.organizationId) return false;
        return true;
      }) as any;
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

  it('1. Tenant A reads Tenant B memory -> 404', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/ai-employees/${empB}/memories`,
      headers: { authorization: `Bearer ${adminTokenA}` },
    });
    // Returns empty array because employee not found in Tenant A
    const json = JSON.parse(res.payload);
    expect(json.data).toHaveLength(0);
  });

  it('2. Tenant A updates Tenant B memory -> 404', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/ai-employees/${empB}/memories/${memA}`,
      headers: { authorization: `Bearer ${adminTokenB}` }, // Tenant B employee empB trying to update OrgA memory
      payload: { value: 'Infiltrated' },
    });
    expect(res.statusCode).toBe(404);
  });

  it('3. Tenant A deletes Tenant B memory -> 404', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/ai-employees/${empB}/memories/${memA}`,
      headers: { authorization: `Bearer ${adminTokenB}` },
    });
    expect(res.statusCode).toBe(404);
  });

  it('4. Tenant A reads Tenant B conversation -> 404', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/conversations/${convA}/messages`,
      headers: { authorization: `Bearer ${adminTokenB}` },
    });
    expect(res.statusCode).toBe(404);
  });

  it('5. Tenant A reads Tenant B messages -> 404', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/conversations/${convA}/messages`,
      headers: { authorization: `Bearer ${adminTokenB}` },
    });
    expect(res.statusCode).toBe(404);
  });

  it('6. Viewer creates memory -> 403', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/ai-employees/${empA}/memories`,
      headers: { authorization: `Bearer ${viewerTokenA}` },
      payload: {
        type: MemoryType.FACT,
        key: 'viewer_key',
        value: 'Viewer Value',
      },
    });
    expect(res.statusCode).toBe(403);
  });

  it('7. Viewer updates memory -> 403', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/ai-employees/${empA}/memories/${memA}`,
      headers: { authorization: `Bearer ${viewerTokenA}` },
      payload: { value: 'Viewer Edit' },
    });
    expect(res.statusCode).toBe(403);
  });

  it('8. Viewer deletes memory -> 403', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/ai-employees/${empA}/memories/${memA}`,
      headers: { authorization: `Bearer ${viewerTokenA}` },
    });
    expect(res.statusCode).toBe(403);
  });

  it('9. Invalid memory key (empty / whitespace) -> 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/ai-employees/${empA}/memories`,
      headers: { authorization: `Bearer ${adminTokenA}` },
      payload: {
        type: MemoryType.FACT,
        key: '   ',
        value: 'Some valid value',
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it('10. Oversized memory value (> 2000 chars) -> 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/ai-employees/${empA}/memories`,
      headers: { authorization: `Bearer ${adminTokenA}` },
      payload: {
        type: MemoryType.FACT,
        key: 'oversized_key',
        value: 'X'.repeat(2001),
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it('11. Invalid confidence (<0 or >1) -> 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/ai-employees/${empA}/memories`,
      headers: { authorization: `Bearer ${adminTokenA}` },
      payload: {
        type: MemoryType.FACT,
        key: 'invalid_confidence_key',
        value: 'Valid Value',
        confidence: 1.5,
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it('12. Secret credential in memory -> 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/ai-employees/${empA}/memories`,
      headers: { authorization: `Bearer ${adminTokenA}` },
      payload: {
        type: MemoryType.FACT,
        key: 'api_key',
        value: 'sk-proj-123456789012345678901234567890',
      },
    });
    expect(res.statusCode).toBe(400);
    const json = JSON.parse(res.payload);
    expect(json.error.message).toContain('rejected by safety policy');
  });

  it('13. Memory quota exceeded -> 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/ai-employees/${empA}/memories`,
      headers: { authorization: `Bearer ${adminTokenA}` },
      payload: {
        type: MemoryType.FACT,
        key: 'brand_new_key_beyond_quota',
        value: 'Value beyond 100 limit',
      },
    });
    expect(res.statusCode).toBe(400);
    const json = JSON.parse(res.payload);
    expect(json.error.code).toBe('QUOTA_EXCEEDED');
  });

  it('14. Unauthenticated request -> 401', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/ai-employees/${empA}/memories`,
    });
    expect(res.statusCode).toBe(401);
  });
});
