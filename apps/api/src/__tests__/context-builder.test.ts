import { describe, it, expect, vi, beforeAll } from 'vitest';
import { ContextBuilder } from '../modules/context/context-builder';
import { AIEmployee, Message } from '@cryptonion/db';
import { MemoryService } from '../modules/memory/memory.service';
import { MemoryType, MemorySource, MessageSender } from '@cryptonion/shared';

describe('ContextBuilder Unit & Bounding Tests', () => {
  const orgId = '11111111-1111-1111-1111-111111111111';
  const empId = '22222222-2222-2222-2222-222222222222';
  const convId = '33333333-3333-3333-3333-333333333333';

  beforeAll(() => {
    vi.spyOn(AIEmployee, 'findOne').mockResolvedValue({
      id: empId,
      organizationId: orgId,
      llmConfig: {
        systemPrompt: 'You are Maya, an autonomous SDR at Cryptonion.',
      },
    } as any);

    vi.spyOn(MemoryService, 'getContextMemories').mockResolvedValue([
      {
        id: 'm1',
        organizationId: orgId,
        aiEmployeeId: empId,
        type: MemoryType.INSTRUCTION,
        key: 'tone',
        value: 'Concise and friendly',
        confidence: 1.0,
        source: MemorySource.EXPLICIT_ADMIN,
      },
      {
        id: 'm2',
        organizationId: orgId,
        aiEmployeeId: empId,
        type: MemoryType.FACT,
        key: 'company_name',
        value: 'ABC Technologies',
        confidence: 0.9,
        source: MemorySource.CONVERSATION,
      },
    ] as any);

    vi.spyOn(Message, 'findAll').mockResolvedValue([
      {
        id: 'msg2',
        conversationId: convId,
        sender: MessageSender.AI_EMPLOYEE,
        content: 'Hello! How can I help you today?',
        createdAt: new Date('2026-10-01T10:00:05Z'),
      },
      {
        id: 'msg1',
        conversationId: convId,
        sender: MessageSender.USER,
        content: 'Hi there!',
        createdAt: new Date('2026-10-01T10:00:00Z'),
      },
    ] as any);
  });

  it('assembles system prompt, formatted structured memories, recent history, and current user turn', async () => {
    const context = await ContextBuilder.buildContext({
      organizationId: orgId,
      aiEmployeeId: empId,
      conversationId: convId,
      currentUserMessage: 'Can we schedule a call for tomorrow?',
    });

    // 1. System Prompt includes base instructions and structured memories
    expect(context.systemPrompt).toContain('You are Maya, an autonomous SDR at Cryptonion.');
    expect(context.systemPrompt).toContain('[INSTRUCTION] tone: Concise and friendly');
    expect(context.systemPrompt).toContain('[FACT] company_name: ABC Technologies');
    expect(context.memoriesInjected).toBe(2);

    // 2. Chat history contains chronological turns
    expect(context.chatHistory).toHaveLength(2);
    expect(context.chatHistory[0]).toEqual({ role: 'user', content: 'Hi there!' });
    expect(context.chatHistory[1]).toEqual({ role: 'assistant', content: 'Hello! How can I help you today?' });

    // 3. Current user message is preserved
    expect(context.currentUserMessage).toBe('Can we schedule a call for tomorrow?');
  });

  it('strictly preserves system prompt and user message when context exceeds maxContextChars', async () => {
    // Generate long history turns
    vi.spyOn(Message, 'findAll').mockResolvedValueOnce([
      {
        id: 'msg1',
        conversationId: convId,
        sender: MessageSender.USER,
        content: 'A'.repeat(500),
        createdAt: new Date('2026-10-01T10:00:00Z'),
      },
      {
        id: 'msg2',
        conversationId: convId,
        sender: MessageSender.AI_EMPLOYEE,
        content: 'B'.repeat(500),
        createdAt: new Date('2026-10-01T10:00:05Z'),
      },
    ] as any);

    const context = await ContextBuilder.buildContext({
      organizationId: orgId,
      aiEmployeeId: empId,
      conversationId: convId,
      currentUserMessage: 'Short message',
      maxContextChars: 600, // Strict small context budget
    });

    // System prompt and current user message must remain intact
    expect(context.systemPrompt).toContain('You are Maya');
    expect(context.currentUserMessage).toBe('Short message');
    // Long history is pruned to fit within budget
    expect(context.chatHistory.length).toBeLessThan(2);
  });
});
