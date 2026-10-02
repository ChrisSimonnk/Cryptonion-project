import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { buildApp } from '../app';
import { FastifyInstance } from 'fastify';
import { Role, EmployeeRole, EmployeeStatus, AIExecutionStatus } from '@cryptonion/shared';
import { AIEmployee, AIExecution } from '@cryptonion/db';

describe('Phase 3: AI Employee Core Runtime, Lifecycle & Tenant Isolation', () => {
  let app: FastifyInstance;

  const orgA_Id = '11111111-1111-1111-1111-111111111111';
  const orgB_Id = '22222222-2222-2222-2222-222222222222';
  const userA_Id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const userB_Id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

  let adminTokenA: string;
  let viewerTokenA: string;
  let adminTokenB: string;

  let createdEmployeeIdA: string;

  // In-memory store for isolated unit/integration tests
  const employeesStore: any[] = [];
  const executionsStore: any[] = [];

  beforeAll(async () => {
    // Setup model spies
    vi.spyOn(AIEmployee, 'findAll').mockImplementation(async (options: any) => {
      const where = options?.where || {};
      return employeesStore.filter((emp) => {
        if (where.organizationId && emp.organizationId !== where.organizationId) return false;
        return true;
      }) as any;
    });

    vi.spyOn(AIEmployee, 'findOne').mockImplementation(async (options: any) => {
      const where = options?.where || {};
      const found = employeesStore.find((emp) => {
        if (where.id && emp.id !== where.id) return false;
        if (where.organizationId && emp.organizationId !== where.organizationId) return false;
        return true;
      });
      if (!found) return null as any;
      found.update = async (patch: any) => {
        Object.assign(found, patch);
        return found;
      };
      return found as any;
    });

    vi.spyOn(AIEmployee, 'create').mockImplementation(async (data: any) => {
      const empInstance = {
        id: data.id || '33333333-3333-3333-3333-333333333333',
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
        update: async (patch: any) => Object.assign(empInstance, patch),
      };
      employeesStore.push(empInstance);
      return empInstance as any;
    });

    vi.spyOn(AIExecution, 'create').mockImplementation(async (data: any) => {
      const execInstance = {
        id: data.id || '44444444-4444-4444-4444-444444444444',
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
        update: async (patch: any) => Object.assign(execInstance, patch),
      };
      executionsStore.push(execInstance);
      return execInstance as any;
    });

    vi.spyOn(AIExecution, 'findAll').mockImplementation(async (options: any) => {
      const where = options?.where || {};
      return executionsStore.filter((exec) => {
        if (where.organizationId && exec.organizationId !== where.organizationId) return false;
        if (where.aiEmployeeId && exec.aiEmployeeId !== where.aiEmployeeId) return false;
        return true;
      }) as any;
    });

    app = await buildApp();
    await app.ready();

    adminTokenA = app.jwt.sign({
      userId: userA_Id,
      email: 'admin@orga.com',
      organizationId: orgA_Id,
      membershipId: 'mem-admin-a',
      role: Role.ADMIN,
    });

    viewerTokenA = app.jwt.sign({
      userId: userA_Id,
      email: 'viewer@orga.com',
      organizationId: orgA_Id,
      membershipId: 'mem-viewer-a',
      role: Role.VIEWER,
    });

    adminTokenB = app.jwt.sign({
      userId: userB_Id,
      email: 'admin@orgb.com',
      organizationId: orgB_Id,
      membershipId: 'mem-admin-b',
      role: Role.ADMIN,
    });
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    if (app) {
      await app.close();
    }
  });

  describe('AI Employee Configuration & Validation', () => {
    it('rejects creation with negative temperature', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/ai-employees',
        headers: { authorization: `Bearer ${adminTokenA}` },
        payload: {
          name: 'Invalid Temp Agent',
          llmConfig: {
            provider: 'ollama',
            model: 'llama3:8b',
            temperature: -0.5,
            maxTokens: 512,
            systemPrompt: 'You are an AI assistant.',
          },
        },
      });
      expect(res.statusCode).toBe(400);
    });

    it('rejects creation with excessive temperature (>2.0)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/ai-employees',
        headers: { authorization: `Bearer ${adminTokenA}` },
        payload: {
          name: 'Invalid High Temp Agent',
          llmConfig: {
            provider: 'ollama',
            model: 'llama3:8b',
            temperature: 2.5,
            maxTokens: 512,
            systemPrompt: 'You are an AI assistant.',
          },
        },
      });
      expect(res.statusCode).toBe(400);
    });

    it('rejects creation with out-of-range token limits (<10 or >8192)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/ai-employees',
        headers: { authorization: `Bearer ${adminTokenA}` },
        payload: {
          name: 'Invalid Token Limit Agent',
          llmConfig: {
            provider: 'ollama',
            model: 'llama3:8b',
            temperature: 0.7,
            maxTokens: 5,
            systemPrompt: 'You are an AI assistant.',
          },
        },
      });
      expect(res.statusCode).toBe(400);
    });

    it('rejects creation with empty model or empty name', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/ai-employees',
        headers: { authorization: `Bearer ${adminTokenA}` },
        payload: {
          name: '',
          llmConfig: {
            provider: 'ollama',
            model: '',
            temperature: 0.7,
            maxTokens: 512,
            systemPrompt: 'You are an AI assistant.',
          },
        },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('AI Employee Lifecycle & RBAC Authorization', () => {
    it('blocks unauthenticated requests with 401', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/ai-employees',
      });
      expect(res.statusCode).toBe(401);
    });

    it('denies AI Employee creation to VIEWER role with 403', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/ai-employees',
        headers: { authorization: `Bearer ${viewerTokenA}` },
        payload: {
          name: 'Unauthorized Agent',
          role: EmployeeRole.CUSTOMER_SUPPORT,
          status: EmployeeStatus.DRAFT,
          llmConfig: {
            provider: 'ollama',
            model: 'llama3:8b',
            temperature: 0.7,
            maxTokens: 512,
            systemPrompt: 'You are a customer support agent.',
          },
        },
      });
      expect(res.statusCode).toBe(403);
    });

    it('creates an AI Employee successfully with ADMIN role', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/ai-employees',
        headers: { authorization: `Bearer ${adminTokenA}` },
        payload: {
          name: 'Sarah - Outbound SDR',
          role: EmployeeRole.SALES_REP,
          status: EmployeeStatus.DRAFT,
          llmConfig: {
            provider: 'ollama',
            model: 'llama3:8b',
            temperature: 0.7,
            maxTokens: 512,
            systemPrompt: 'You are Sarah, an outbound SDR qualifying leads.',
          },
          voiceConfig: {
            provider: 'piper',
            voiceId: 'en_US-lessac-medium',
            speed: 1.0,
            pitch: 1.0,
          },
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.name).toBe('Sarah - Outbound SDR');
      expect(body.data.status).toBe(EmployeeStatus.DRAFT);
      expect(body.data.organizationId).toBe(orgA_Id);

      createdEmployeeIdA = body.data.id;
    });

    it('retrieves created AI Employee by ID', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/ai-employees/${createdEmployeeIdA}`,
        headers: { authorization: `Bearer ${adminTokenA}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.id).toBe(createdEmployeeIdA);
    });

    it('lists AI Employees for organization A', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/ai-employees',
        headers: { authorization: `Bearer ${adminTokenA}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.some((e: any) => e.id === createdEmployeeIdA)).toBe(true);
    });

    it('transitions status: DRAFT -> ACTIVE via /activate endpoint', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/ai-employees/${createdEmployeeIdA}/activate`,
        headers: { authorization: `Bearer ${adminTokenA}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.status).toBe(EmployeeStatus.ACTIVE);
    });

    it('transitions status: ACTIVE -> PAUSED via /pause endpoint', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/ai-employees/${createdEmployeeIdA}/pause`,
        headers: { authorization: `Bearer ${adminTokenA}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.status).toBe(EmployeeStatus.PAUSED);
    });

    it('reactivates employee for execution tests', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/ai-employees/${createdEmployeeIdA}/activate`,
        headers: { authorization: `Bearer ${adminTokenA}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.status).toBe(EmployeeStatus.ACTIVE);
    });
  });

  describe('Multi-Tenant Isolation & IDOR Protection', () => {
    it('blocks Organization B from viewing Organization A employee (returns 404)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/ai-employees/${createdEmployeeIdA}`,
        headers: { authorization: `Bearer ${adminTokenB}` },
      });

      expect(res.statusCode).toBe(404);
      const body = JSON.parse(res.body);
      expect(body.error.code).toBe('NOT_FOUND');
    });

    it('blocks Organization B from updating Organization A employee (returns 404)', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/ai-employees/${createdEmployeeIdA}`,
        headers: { authorization: `Bearer ${adminTokenB}` },
        payload: { name: 'Hijacked Name' },
      });

      expect(res.statusCode).toBe(404);
    });

    it('blocks Organization B from activating/pausing Organization A employee (returns 404)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/ai-employees/${createdEmployeeIdA}/pause`,
        headers: { authorization: `Bearer ${adminTokenB}` },
      });

      expect(res.statusCode).toBe(404);
    });

    it('blocks Organization B from executing Organization A employee (returns 404)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/ai-employees/${createdEmployeeIdA}/execute`,
        headers: { authorization: `Bearer ${adminTokenB}` },
        payload: { prompt: 'Test cross-tenant exploit' },
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('AI Employee Runtime Execution & Execution Model', () => {
    it('executes a bounded reasoning turn for an ACTIVE employee and persists execution record', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/ai-employees/${createdEmployeeIdA}/execute`,
        headers: { authorization: `Bearer ${adminTokenA}` },
        payload: {
          prompt: 'Hello Sarah! What are your qualifications for sales discovery?',
          maxTurns: 1,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.executionId).toBeDefined();
      expect(body.data.status).toBe(AIExecutionStatus.COMPLETED);
      expect(body.data.reply).toBeDefined();
      expect(body.data.tokensUsed).toBeGreaterThan(0);
      expect(body.data.latencyMs).toBeGreaterThanOrEqual(0);
      expect(body.data.provider).toBe('ollama');
    });

    it('rejects execution when employee is PAUSED with code EMPLOYEE_INACTIVE', async () => {
      // Pause employee
      await app.inject({
        method: 'POST',
        url: `/api/ai-employees/${createdEmployeeIdA}/pause`,
        headers: { authorization: `Bearer ${adminTokenA}` },
      });

      const res = await app.inject({
        method: 'POST',
        url: `/api/ai-employees/${createdEmployeeIdA}/execute`,
        headers: { authorization: `Bearer ${adminTokenA}` },
        payload: {
          prompt: 'Should fail because employee is paused',
        },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.error.code).toBe('EMPLOYEE_INACTIVE');
    });

    it('lists execution history for the employee scoped to tenant', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/ai-employees/${createdEmployeeIdA}/executions`,
        headers: { authorization: `Bearer ${adminTokenA}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThan(0);
      expect(body.data[0].organizationId).toBe(orgA_Id);
    });

    it('archives AI Employee and ensures subsequent execution is rejected', async () => {
      const archiveRes = await app.inject({
        method: 'POST',
        url: `/api/ai-employees/${createdEmployeeIdA}/archive`,
        headers: { authorization: `Bearer ${adminTokenA}` },
      });

      expect(archiveRes.statusCode).toBe(200);
      const archiveBody = JSON.parse(archiveRes.body);
      expect(archiveBody.data.status).toBe(EmployeeStatus.ARCHIVED);

      const execRes = await app.inject({
        method: 'POST',
        url: `/api/ai-employees/${createdEmployeeIdA}/execute`,
        headers: { authorization: `Bearer ${adminTokenA}` },
        payload: {
          prompt: 'Attempt execute on archived employee',
        },
      });

      expect(execRes.statusCode).toBe(400);
      const execBody = JSON.parse(execRes.body);
      expect(execBody.error.code).toBe('EMPLOYEE_INACTIVE');
    });
  });
});
