import { describe, it, expect } from 'vitest';
import { AIMemory } from '../models/AIMemory';
import { MemoryType, MemorySource } from '@cryptonion/shared';

describe('AIMemory Database Model & Validation', () => {
  it('instantiates valid AIMemory model attributes', () => {
    const memory = AIMemory.build({
      organizationId: '11111111-1111-1111-1111-111111111111',
      aiEmployeeId: '22222222-2222-2222-2222-222222222222',
      leadId: null,
      type: MemoryType.FACT,
      key: 'company_name',
      value: 'Cryptonion Technologies Inc.',
      confidence: 0.95,
      source: MemorySource.CONVERSATION,
      metadata: { sourceMsg: '123' },
    });

    expect(memory.id).toBeDefined();
    expect(memory.organizationId).toBe('11111111-1111-1111-1111-111111111111');
    expect(memory.aiEmployeeId).toBe('22222222-2222-2222-2222-222222222222');
    expect(memory.type).toBe(MemoryType.FACT);
    expect(memory.key).toBe('company_name');
    expect(memory.value).toBe('Cryptonion Technologies Inc.');
    expect(memory.confidence).toBe(0.95);
    expect(memory.source).toBe(MemorySource.CONVERSATION);
  });

  it('supports all four MemoryType enum values', () => {
    const types = [
      MemoryType.USER_PREFERENCE,
      MemoryType.FACT,
      MemoryType.INSTRUCTION,
      MemoryType.SYSTEM_NOTE,
    ];

    for (const type of types) {
      const memory = AIMemory.build({
        organizationId: '11111111-1111-1111-1111-111111111111',
        aiEmployeeId: '22222222-2222-2222-2222-222222222222',
        type,
        key: `test_key_${type}`,
        value: `test_val_${type}`,
      });
      expect(memory.type).toBe(type);
    }
  });

  it('supports all MemorySource enum values', () => {
    const sources = [
      MemorySource.CONVERSATION,
      MemorySource.EXPLICIT_ADMIN,
      MemorySource.SYSTEM,
    ];

    for (const source of sources) {
      const memory = AIMemory.build({
        organizationId: '11111111-1111-1111-1111-111111111111',
        aiEmployeeId: '22222222-2222-2222-2222-222222222222',
        type: MemoryType.USER_PREFERENCE,
        key: 'preferred_language',
        value: 'English',
        source,
      });
      expect(memory.source).toBe(source);
    }
  });
});
