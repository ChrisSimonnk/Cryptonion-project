import { DataTypes, QueryInterface, Sequelize } from 'sequelize';
import { Migration } from './types';
import {
  CampaignStatus,
  LeadStatus,
  CallDirection,
  CallStatus,
  MessageSender,
  KnowledgeStatus,
} from '@cryptonion/shared';
import { VECTOR_DIMENSION } from '../models/DocumentChunk';

export const migration003: Migration = {
  name: '003_campaigns_leads_telephony',

  async up(queryInterface: QueryInterface, sequelize: Sequelize) {
    // 1. campaigns
    await queryInterface.createTable('campaigns', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      organizationId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'organizations', key: 'id' },
        onDelete: 'CASCADE',
      },
      aiEmployeeId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'ai_employees', key: 'id' },
        onDelete: 'CASCADE',
      },
      name: {
        type: DataTypes.STRING(128),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      status: {
        type: DataTypes.STRING(32),
        defaultValue: CampaignStatus.DRAFT,
        allowNull: false,
      },
      scheduledAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      totalLeads: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
      },
      contactedLeads: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
      },
      successfulCalls: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    });

    // 2. leads
    await queryInterface.createTable('leads', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      organizationId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'organizations', key: 'id' },
        onDelete: 'CASCADE',
      },
      campaignId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'campaigns', key: 'id' },
        onDelete: 'SET NULL',
      },
      firstName: {
        type: DataTypes.STRING(64),
        allowNull: false,
      },
      lastName: {
        type: DataTypes.STRING(64),
        allowNull: true,
      },
      phoneNumber: {
        type: DataTypes.STRING(32),
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      status: {
        type: DataTypes.STRING(32),
        defaultValue: LeadStatus.NEW,
        allowNull: false,
      },
      customData: {
        type: DataTypes.JSONB,
        defaultValue: {},
        allowNull: false,
      },
      lastContactedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    });

    // 3. calls
    await queryInterface.createTable('calls', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      organizationId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'organizations', key: 'id' },
        onDelete: 'CASCADE',
      },
      aiEmployeeId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'ai_employees', key: 'id' },
        onDelete: 'CASCADE',
      },
      leadId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'leads', key: 'id' },
        onDelete: 'SET NULL',
      },
      campaignId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'campaigns', key: 'id' },
        onDelete: 'SET NULL',
      },
      direction: {
        type: DataTypes.STRING(32),
        defaultValue: CallDirection.OUTBOUND,
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING(32),
        defaultValue: CallStatus.QUEUED,
        allowNull: false,
      },
      callerNumber: {
        type: DataTypes.STRING(32),
        allowNull: false,
      },
      calleeNumber: {
        type: DataTypes.STRING(32),
        allowNull: false,
      },
      durationSeconds: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
      },
      recordingUrl: {
        type: DataTypes.STRING(512),
        allowNull: true,
      },
      summary: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      sentiment: {
        type: DataTypes.STRING(32),
        allowNull: true,
      },
      startedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      endedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    });

    // 4. conversations
    await queryInterface.createTable('conversations', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      callId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'calls', key: 'id' },
        onDelete: 'CASCADE',
      },
      metadata: {
        type: DataTypes.JSONB,
        defaultValue: {},
        allowNull: false,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    });

    // 5. messages
    await queryInterface.createTable('messages', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      conversationId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'conversations', key: 'id' },
        onDelete: 'CASCADE',
      },
      sender: {
        type: DataTypes.STRING(32),
        allowNull: false,
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      audioUrl: {
        type: DataTypes.STRING(512),
        allowNull: true,
      },
      latencyMs: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      metadata: {
        type: DataTypes.JSONB,
        defaultValue: {},
        allowNull: false,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    });

    // 6. knowledge_bases
    await queryInterface.createTable('knowledge_bases', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      organizationId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'organizations', key: 'id' },
        onDelete: 'CASCADE',
      },
      aiEmployeeId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'ai_employees', key: 'id' },
        onDelete: 'SET NULL',
      },
      name: {
        type: DataTypes.STRING(128),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      status: {
        type: DataTypes.STRING(32),
        defaultValue: KnowledgeStatus.PROCESSING,
        allowNull: false,
      },
      chunkCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    });

    // 7. document_chunks (with pgvector support if available)
    await queryInterface.createTable('document_chunks', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      knowledgeBaseId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'knowledge_bases', key: 'id' },
        onDelete: 'CASCADE',
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      embedding: {
        type: DataTypes.TEXT, // Raw/Vector column
        allowNull: true,
      },
      metadata: {
        type: DataTypes.JSONB,
        defaultValue: {},
        allowNull: false,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    });
  },

  async down(queryInterface: QueryInterface) {
    await queryInterface.dropTable('document_chunks');
    await queryInterface.dropTable('knowledge_bases');
    await queryInterface.dropTable('messages');
    await queryInterface.dropTable('conversations');
    await queryInterface.dropTable('calls');
    await queryInterface.dropTable('leads');
    await queryInterface.dropTable('campaigns');
  },
};
