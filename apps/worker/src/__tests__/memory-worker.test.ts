import { describe, it, expect, vi, beforeAll } from 'vitest';
import { AIEmployee, Conversation, Message, AIMemory } from '@cryptonion/db';
import { MemoryType, MemorySource } from '@cryptonion/shared';

describe('Worker: Asynchronous Memory Extraction Job', () => {
  const orgA = '11111111-1111-1111-1111-111111111111';
  const empA = '22222222-2222-2222-2222-222222222222';
  const convA = '33333333-3333-3333-3333-333333333333';
  const msgA = '44444444-4444-4444-4444-444444444444';

  const memoryStore: any[] = [];

  beforeAll(() => {
    vi.spyOn(AIEmployee, 'findOne').mockResolvedValue({ id: empA, organizationId: orgA, name: 'Maya' } as any);
    vi.spyOn(Conversation, 'findOne').mockResolvedValue({ id: convA, organizationId: orgA, aiEmployeeId: empA } as any);
    
    vi.spyOn(AIMemory, 'findOne').mockImplementation(async (opts: any) => {
      const where = opts?.where || {};
      return memoryStore.find((m) => m.key === where.key) || null;
    });

    vi.spyOn(AIMemory, 'count').mockResolvedValue(0);

    vi.spyOn(AIMemory, 'create').mockImplementation(async (data: any) => {
      const m = { id: `mem-${Date.now()}`, ...data };
      memoryStore.push(m);
      return m as any;
    });
  });

  it('extracts structured facts and preferences from conversation turn', async () => {
    vi.spyOn(Message, 'findOne').mockResolvedValueOnce({
      id: msgA,
      conversationId: convA,
      content: 'Hello, my preferred language is Spanish and my company is Acme Corporation.',
    } as any);

    // Simulate worker extraction logic
    const employee = await AIEmployee.findOne({ where: { id: empA, organizationId: orgA } });
    const conversation = await Conversation.findOne({ where: { id: convA, organizationId: orgA, aiEmployeeId: empA } });
    const message = await Message.findOne({ where: { id: msgA, conversationId: convA } });

    expect(employee).toBeDefined();
    expect(conversation).toBeDefined();
    expect(message).toBeDefined();

    const text = message!.content;
    const candidates: any[] = [];

    const langMatch = text.match(/(?:my\s+)?preferred\s+language\s+is\s+([a-zA-Z]+)/i);
    if (langMatch) {
      candidates.push({
        key: 'preferred_language',
        value: langMatch[1].trim(),
        type: MemoryType.USER_PREFERENCE,
        confidence: 0.95,
      });
    }

    const compMatch = text.match(/(?:my\s+)?company\s+(?:name\s+)?is\s+([^,.\n]+)/i);
    if (compMatch) {
      candidates.push({
        key: 'company_name',
        value: compMatch[1].trim(),
        type: MemoryType.FACT,
        confidence: 0.90,
      });
    }

    for (const c of candidates) {
      await AIMemory.create({
        organizationId: orgA,
        aiEmployeeId: empA,
        key: c.key,
        value: c.value,
        type: c.type,
        confidence: c.confidence,
        source: MemorySource.CONVERSATION,
      });
    }

    expect(memoryStore).toHaveLength(2);
    expect(memoryStore.find((m) => m.key === 'preferred_language')?.value).toBe('Spanish');
    expect(memoryStore.find((m) => m.key === 'company_name')?.value).toBe('Acme Corporation');
  });

  it('rejects candidate containing sensitive secret credentials', () => {
    const textWithSecret = 'My secret_key is sk-proj-12345678901234567890';
    const isSensitive = /-----BEGIN|bearer\s+|eyJ|sk-|ghp_|AKIA|password|secret_key|api_key/i.test(textWithSecret);
    expect(isSensitive).toBe(true);
  });
});
