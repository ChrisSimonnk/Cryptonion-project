import { describe, it, expect } from 'vitest';
import {
  User,
  Organization,
  Membership,
  AIEmployee,
  AIExecution,
  Campaign,
  Lead,
  Call,
  Conversation,
  Message,
  KnowledgeBase,
  DocumentChunk,
  setupAssociations,
} from '../index';

describe('Database Models & Relations', () => {
  it('instantiates all core multi-tenant models with table definitions', () => {
    expect(User.tableName).toBe('users');
    expect(Organization.tableName).toBe('organizations');
    expect(Membership.tableName).toBe('memberships');
    expect(AIEmployee.tableName).toBe('ai_employees');
    expect(AIExecution.tableName).toBe('ai_executions');
    expect(Campaign.tableName).toBe('campaigns');
    expect(Lead.tableName).toBe('leads');
    expect(Call.tableName).toBe('calls');
    expect(Conversation.tableName).toBe('conversations');
    expect(Message.tableName).toBe('messages');
    expect(KnowledgeBase.tableName).toBe('knowledge_bases');
    expect(DocumentChunk.tableName).toBe('document_chunks');
  });

  it('configures associations between organization and child entities without error', () => {
    expect(() => setupAssociations()).not.toThrow();
  });
});
