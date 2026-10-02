import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { buildApp } from '../app';
import { FastifyInstance } from 'fastify';
import { Role, EmployeeStatus, MessageSender, MemoryType } from '@cryptonion/shared';
import { Conversation, Message, AIEmployee, AIExecution, AIMemory } from '@cryptonion/db';

describe('Phase 4: Standalone Conversation Platform & Multi-Turn AI Execution', () => {
  let app: FastifyInstance;

  const orgA = '11111111-1111-1111-1111-111111111111';
  const orgB = '22222222-2222-2222-2222-222222222222';
  const empA = '33333333-3333-3333-3333-333333333333';

  let adminTokenA: string;
  let adminTokenB: string;

  const conversationsStore: any[] = [];
  const messagesStore: any[] = [];
  const executionsStore: any[] = [];

  beforeAll(async () => {
    vi.spyOn(AIEmployee, 'findOne').mockImplementation(async (options: any) => {
      const where = options?.where || {};
      if (where.id === empA && (!where.organizationId || where.organizationId === orgA)) {
        return {
          id: empA,
          organizationId: orgA,
          name: 'Maya SDR',
          status: EmployeeStatus.ACTIVE,
          llmConfig: {
            provider: 'ollama',
            model: 'llama3:8b',
            systemPrompt: 'You are Maya, an autonomous SDR at Cryptonion.',
          },
        } as any;
      }
      return null as any;
    });

    vi.spyOn(AIMemory, 'findAll').mockResolvedValue([
      {
        id: 'mem1',
        organizationId: orgA,
        aiEmployeeId: empA,
        type: MemoryType.FACT,
        key: 'company_name',
        value: 'ABC Technologies',
        confidence: 1.0,
      },
    ] as any);

    vi.spyOn(Conversation, 'create').mockImplementation(async (data: any) => {
      const conv = {
        id: data.id || '99999999-9999-9999-9999-999999999999',
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      conversationsStore.push(conv);
      return conv as any;
    });

    vi.spyOn(Conversation, 'findOne').mockImplementation(async (options: any) => {
      const where = options?.where || {};
      return conversationsStore.find((c) => {
        if (where.id && c.id !== where.id) return false;
        if (where.organizationId && c.organizationId !== where.organizationId) return false;
        return true;
      }) as any;
    });

    vi.spyOn(Conversation, 'findAndCountAll').mockImplementation(async (options: any) => {
      const where = options?.where || {};
      const rows = conversationsStore.filter((c) => {
        if (where.organizationId && c.organizationId !== where.organizationId) return false;
        if (where.aiEmployeeId && c.aiEmployeeId !== where.aiEmployeeId) return false;
        return true;
      });
      return { count: rows.length, rows } as any;
    });

    vi.spyOn(Message, 'create').mockImplementation(async (data: any) => {
      const msg = {
        id: data.id || `88888888-8888-8888-8888-${(messagesStore.length + 1).toString().padStart(12, '0')}`,
        ...data,
        createdAt: new Date(),
      };
      messagesStore.push(msg);
      return msg as any;
    });

    vi.spyOn(Message, 'findAll').mockImplementation(async (options: any) => {
      const where = options?.where || {};
      return messagesStore.filter((m) => m.conversationId === where.conversationId) as any;
    });

    vi.spyOn(Message, 'findAndCountAll').mockImplementation(async (options: any) => {
      const where = options?.where || {};
      const rows = messagesStore.filter((m) => m.conversationId === where.conversationId);
      return { count: rows.length, rows } as any;
    });

    vi.spyOn(AIExecution, 'create').mockImplementation(async (data: any) => {
      const exec = {
        id: data.id || `exec-${Date.now()}`,
        ...data,
        update: async (patch: any) => Object.assign(exec, patch),
      };
      executionsStore.push(exec);
      return exec as any;
    });

    app = await buildApp();
    await app.ready();

    adminTokenA = app.jwt.sign({ userId: 'u1', email: 'admin@a.com', organizationId: orgA, role: Role.ADMIN, membershipId: 'm1' });
    adminTokenB = app.jwt.sign({ userId: 'u2', email: 'admin@b.com', organizationId: orgB, role: Role.ADMIN, membershipId: 'm2' });
  });

  afterAll(async () => {
    await app.close();
  });

  let createdConvId: string;

  it('creates a new conversation for an active AI Employee', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/conversations',
      headers: { authorization: `Bearer ${adminTokenA}` },
      payload: {
        aiEmployeeId: empA,
        channel: 'chat',
      },
    });

    expect(res.statusCode).toBe(201);
    const json = JSON.parse(res.payload);
    expect(json.success).toBe(true);
    expect(json.data.organizationId).toBe(orgA);
    expect(json.data.aiEmployeeId).toBe(empA);
    createdConvId = json.data.id;
  });

  it('sends user message, builds context, triggers AI turn, and persists assistant response', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/conversations/${createdConvId}/messages`,
      headers: { authorization: `Bearer ${adminTokenA}` },
      payload: {
        content: 'Hi Maya, what company do I work for?',
      },
    });

    expect(res.statusCode).toBe(201);
    const json = JSON.parse(res.payload);
    expect(json.success).toBe(true);
    expect(json.data.userMessage.content).toBe('Hi Maya, what company do I work for?');
    expect(json.data.assistantMessage.sender).toBe('AI_EMPLOYEE');
    expect(json.data.executionId).toBeDefined();

    // Verify messages saved to conversation
    const msgRes = await app.inject({
      method: 'GET',
      url: `/api/conversations/${createdConvId}/messages`,
      headers: { authorization: `Bearer ${adminTokenA}` },
    });
    const msgJson = JSON.parse(msgRes.payload);
    expect(msgJson.data).toHaveLength(2); // user turn + assistant turn
    expect(msgJson.data[0].sender).toBe('USER');
    expect(msgJson.data[1].sender).toBe('AI_EMPLOYEE');
  });

  it('enforces tenant isolation: Tenant B cannot read or append to Tenant A conversation (404)', async () => {
    const readRes = await app.inject({
      method: 'GET',
      url: `/api/conversations/${createdConvId}/messages`,
      headers: { authorization: `Bearer ${adminTokenB}` },
    });
    expect(readRes.statusCode).toBe(404);

    const writeRes = await app.inject({
      method: 'POST',
      url: `/api/conversations/${createdConvId}/messages`,
      headers: { authorization: `Bearer ${adminTokenB}` },
      payload: {
        content: 'Unauthorized probe',
      },
    });
    expect(writeRes.statusCode).toBe(404);
  });
});
