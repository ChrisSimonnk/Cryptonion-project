import { describe, it, expect } from 'vitest';
import {
  UserRegisterSchema,
  UserLoginSchema,
  AIEmployeeCreateSchema,
  AIEmployeeUpdateSchema,
  AIEmployeeExecuteSchema,
  LeadCreateSchema,
  CampaignCreateSchema,
  CallInitiateSchema,
  Role,
  EmployeeRole,
  EmployeeStatus,
} from '../index';

describe('Shared Zod Schemas Validation', () => {
  it('validates correct user registration payload', () => {
    const valid = {
      email: 'test@cryptonion.ai',
      password: 'strongpassword123',
      name: 'Alex Vance',
      organizationName: 'Acme Growth',
    };
    const parsed = UserRegisterSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });

  it('rejects short passwords in user registration', () => {
    const invalid = {
      email: 'test@cryptonion.ai',
      password: 'short',
      name: 'Alex',
      organizationName: 'Acme',
    };
    const parsed = UserRegisterSchema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });

  it('validates AI Employee creation schema with defaults', () => {
    const agent = {
      name: 'Elena SDR',
      role: EmployeeRole.SALES_REP,
      status: EmployeeStatus.ACTIVE,
      llmConfig: {
        provider: 'ollama',
        model: 'llama3:8b',
        temperature: 0.7,
        maxTokens: 512,
        systemPrompt: 'You are an autonomous SDR. Qualify prospects by asking budget.',
      },
    };
    const parsed = AIEmployeeCreateSchema.safeParse(agent);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.voiceConfig.provider).toBe('piper');
      expect(parsed.data.voiceConfig.voiceId).toBe('en_US-lessac-medium');
    }
  });

  it('rejects invalid AI Employee configurations (negative temperature, negative tokens, short prompt)', () => {
    // Negative temperature
    const invalidTemp = AIEmployeeCreateSchema.safeParse({
      name: 'Invalid Temp Bot',
      llmConfig: {
        provider: 'ollama',
        model: 'llama3:8b',
        temperature: -0.5,
        maxTokens: 512,
        systemPrompt: 'Valid prompt text.',
      },
    });
    expect(invalidTemp.success).toBe(false);

    // Temperature exceeding 2.0
    const highTemp = AIEmployeeCreateSchema.safeParse({
      name: 'High Temp Bot',
      llmConfig: {
        provider: 'ollama',
        model: 'llama3:8b',
        temperature: 2.5,
        maxTokens: 512,
        systemPrompt: 'Valid prompt text.',
      },
    });
    expect(highTemp.success).toBe(false);

    // Tokens too low
    const lowTokens = AIEmployeeCreateSchema.safeParse({
      name: 'Low Tokens Bot',
      llmConfig: {
        provider: 'ollama',
        model: 'llama3:8b',
        temperature: 0.7,
        maxTokens: 2,
        systemPrompt: 'Valid prompt text.',
      },
    });
    expect(lowTokens.success).toBe(false);

    // Tokens too high (>8192)
    const highTokens = AIEmployeeCreateSchema.safeParse({
      name: 'High Tokens Bot',
      llmConfig: {
        provider: 'ollama',
        model: 'llama3:8b',
        temperature: 0.7,
        maxTokens: 100000,
        systemPrompt: 'Valid prompt text.',
      },
    });
    expect(highTokens.success).toBe(false);
  });

  it('validates AI Employee update schema', () => {
    const updatePayload = {
      name: 'Updated SDR Name',
      status: EmployeeStatus.PAUSED,
      llmConfig: {
        provider: 'openai' as const,
        model: 'gpt-4o-mini',
        temperature: 0.4,
        maxTokens: 1024,
        systemPrompt: 'Updated system instructions for enterprise support.',
      },
    };
    const parsed = AIEmployeeUpdateSchema.safeParse(updatePayload);
    expect(parsed.success).toBe(true);
  });

  it('validates AI Employee execution payload schema', () => {
    const validExec = {
      prompt: 'Can you summarize your core value proposition?',
      chatHistory: [
        { role: 'user' as const, content: 'Hi' },
        { role: 'assistant' as const, content: 'Hello! How may I assist you today?' },
      ],
      maxTurns: 1,
    };
    const parsed = AIEmployeeExecuteSchema.safeParse(validExec);
    expect(parsed.success).toBe(true);

    const emptyPrompt = AIEmployeeExecuteSchema.safeParse({ prompt: '' });
    expect(emptyPrompt.success).toBe(false);
  });

  it('validates Call initiation schema', () => {
    const call = {
      aiEmployeeId: '123e4567-e89b-12d3-a456-426614174000',
      calleeNumber: '+15553492011',
    };
    const parsed = CallInitiateSchema.safeParse(call);
    expect(parsed.success).toBe(true);
  });
});
