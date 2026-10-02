import { sequelize, connectDB } from './client';
import { User } from './models/User';
import { Organization } from './models/Organization';
import { Membership } from './models/Membership';
import { Invitation } from './models/Invitation';
import { AuditLog } from './models/AuditLog';
import { AIEmployee } from './models/AIEmployee';
import { AIExecution } from './models/AIExecution';
import { Campaign } from './models/Campaign';
import { Lead } from './models/Lead';
import { Call } from './models/Call';
import { Conversation } from './models/Conversation';
import { Message } from './models/Message';
import { AIMemory } from './models/AIMemory';
import { KnowledgeBase } from './models/KnowledgeBase';
import { Document } from './models/Document';
import { DocumentChunk, VECTOR_DIMENSION } from './models/DocumentChunk';
import { migrationRunner } from './migrations/runner';

// Setup Model Relationships & Associations
export function setupAssociations() {
  // User <-> Organization through Membership
  User.hasMany(Membership, { foreignKey: 'userId', as: 'memberships' });
  Membership.belongsTo(User, { foreignKey: 'userId', as: 'user' });

  Organization.hasMany(Membership, { foreignKey: 'organizationId', as: 'memberships' });
  Membership.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });

  User.belongsToMany(Organization, { through: Membership, foreignKey: 'userId', otherKey: 'organizationId', as: 'organizations' });
  Organization.belongsToMany(User, { through: Membership, foreignKey: 'organizationId', otherKey: 'userId', as: 'members' });

  // Organization -> Invitations
  Organization.hasMany(Invitation, { foreignKey: 'organizationId', as: 'invitations' });
  Invitation.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });

  User.hasMany(Invitation, { foreignKey: 'invitedById', as: 'sentInvitations' });
  Invitation.belongsTo(User, { foreignKey: 'invitedById', as: 'invitedBy' });

  // Organization & User -> AuditLogs
  Organization.hasMany(AuditLog, { foreignKey: 'organizationId', as: 'auditLogs' });
  AuditLog.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });

  User.hasMany(AuditLog, { foreignKey: 'userId', as: 'auditLogs' });
  AuditLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });

  // Organization -> AI Employees
  Organization.hasMany(AIEmployee, { foreignKey: 'organizationId', as: 'aiEmployees' });
  AIEmployee.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });

  // Organization -> Campaigns
  Organization.hasMany(Campaign, { foreignKey: 'organizationId', as: 'campaigns' });
  Campaign.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });

  // AIEmployee -> Campaigns
  AIEmployee.hasMany(Campaign, { foreignKey: 'aiEmployeeId', as: 'campaigns' });
  Campaign.belongsTo(AIEmployee, { foreignKey: 'aiEmployeeId', as: 'aiEmployee' });

  // Organization -> Leads
  Organization.hasMany(Lead, { foreignKey: 'organizationId', as: 'leads' });
  Lead.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });

  // Campaign -> Leads
  Campaign.hasMany(Lead, { foreignKey: 'campaignId', as: 'leads' });
  Lead.belongsTo(Campaign, { foreignKey: 'campaignId', as: 'campaign' });

  // Organization -> Calls
  Organization.hasMany(Call, { foreignKey: 'organizationId', as: 'calls' });
  Call.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });

  // AIEmployee -> Calls
  AIEmployee.hasMany(Call, { foreignKey: 'aiEmployeeId', as: 'calls' });
  Call.belongsTo(AIEmployee, { foreignKey: 'aiEmployeeId', as: 'aiEmployee' });

  // Lead -> Calls
  Lead.hasMany(Call, { foreignKey: 'leadId', as: 'calls' });
  Call.belongsTo(Lead, { foreignKey: 'leadId', as: 'lead' });

  // Campaign -> Calls
  Campaign.hasMany(Call, { foreignKey: 'campaignId', as: 'calls' });
  Call.belongsTo(Campaign, { foreignKey: 'campaignId', as: 'campaign' });

  // Conversation Associations
  Organization.hasMany(Conversation, { foreignKey: 'organizationId', as: 'conversations' });
  Conversation.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });

  AIEmployee.hasMany(Conversation, { foreignKey: 'aiEmployeeId', as: 'conversations' });
  Conversation.belongsTo(AIEmployee, { foreignKey: 'aiEmployeeId', as: 'aiEmployee' });

  Lead.hasMany(Conversation, { foreignKey: 'leadId', as: 'conversations' });
  Conversation.belongsTo(Lead, { foreignKey: 'leadId', as: 'lead' });

  Call.hasOne(Conversation, { foreignKey: 'callId', as: 'conversation' });
  Conversation.belongsTo(Call, { foreignKey: 'callId', as: 'call' });

  Conversation.hasMany(Message, { foreignKey: 'conversationId', as: 'messages' });
  Message.belongsTo(Conversation, { foreignKey: 'conversationId', as: 'conversation' });

  // AI Memory Associations (Phase 4)
  Organization.hasMany(AIMemory, { foreignKey: 'organizationId', as: 'aiMemories' });
  AIMemory.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });

  AIEmployee.hasMany(AIMemory, { foreignKey: 'aiEmployeeId', as: 'memories' });
  AIMemory.belongsTo(AIEmployee, { foreignKey: 'aiEmployeeId', as: 'aiEmployee' });

  Lead.hasMany(AIMemory, { foreignKey: 'leadId', as: 'memories' });
  AIMemory.belongsTo(Lead, { foreignKey: 'leadId', as: 'lead' });

  // Knowledge Base, Document & Chunks (Phase 5A)
  Organization.hasMany(KnowledgeBase, { foreignKey: 'organizationId', as: 'knowledgeBases' });
  KnowledgeBase.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });

  AIEmployee.hasMany(KnowledgeBase, { foreignKey: 'aiEmployeeId', as: 'knowledgeBases' });
  KnowledgeBase.belongsTo(AIEmployee, { foreignKey: 'aiEmployeeId', as: 'aiEmployee' });

  Organization.hasMany(Document, { foreignKey: 'organizationId', as: 'documents' });
  Document.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });

  KnowledgeBase.hasMany(Document, { foreignKey: 'knowledgeBaseId', as: 'documents' });
  Document.belongsTo(KnowledgeBase, { foreignKey: 'knowledgeBaseId', as: 'knowledgeBase' });

  Document.hasMany(DocumentChunk, { foreignKey: 'documentId', as: 'chunks' });
  DocumentChunk.belongsTo(Document, { foreignKey: 'documentId', as: 'document' });

  KnowledgeBase.hasMany(DocumentChunk, { foreignKey: 'knowledgeBaseId', as: 'chunks' });
  DocumentChunk.belongsTo(KnowledgeBase, { foreignKey: 'knowledgeBaseId', as: 'knowledgeBase' });

  // AI Executions
  Organization.hasMany(AIExecution, { foreignKey: 'organizationId', as: 'aiExecutions' });
  AIExecution.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });

  AIEmployee.hasMany(AIExecution, { foreignKey: 'aiEmployeeId', as: 'executions' });
  AIExecution.belongsTo(AIEmployee, { foreignKey: 'aiEmployeeId', as: 'aiEmployee' });
}

// Initialize database using explicit versioned migrations
export async function initDatabase(options: { runMigrations?: boolean } = { runMigrations: true }) {
  await connectDB();
  setupAssociations();

  if (options.runMigrations !== false) {
    await migrationRunner.up();
  }

  // Ensure HNSW vector index is created for pgvector similarity search
  try {
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS document_chunks_embedding_hnsw_idx 
      ON document_chunks USING hnsw (embedding vector_cosine_ops);
    `);
  } catch (indexErr) {
    console.warn('HNSW Index notice:', (indexErr as Error).message);
  }

  console.log(`PostgreSQL database initialized with versioned migrations and pgvector support (Dimension: ${VECTOR_DIMENSION}).`);
}

export * from '@cryptonion/shared';
export * from './migrations';

export {
  sequelize,
  connectDB,
  User,
  Organization,
  Membership,
  Invitation,
  AuditLog,
  AIEmployee,
  AIExecution,
  Campaign,
  Lead,
  Call,
  Conversation,
  Message,
  AIMemory,
  KnowledgeBase,
  Document,
  DocumentChunk,
};


