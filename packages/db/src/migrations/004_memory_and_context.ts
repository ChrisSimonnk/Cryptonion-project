import { DataTypes, QueryInterface, Sequelize } from 'sequelize';
import { Migration } from './types';
import { MemoryType, MemorySource } from '@cryptonion/shared';

export const migration004: Migration = {
  name: '004_memory_and_context',

  async up(queryInterface: QueryInterface, sequelize: Sequelize) {
    // 1. Ensure / update conversations table structure for Phase 4 chat & multi-channel context
    const convDesc = await queryInterface.describeTable('conversations').catch(() => ({} as any));
    
    if (!convDesc.organizationId) {
      await queryInterface.addColumn('conversations', 'organizationId', {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'organizations', key: 'id' },
        onDelete: 'CASCADE',
      });
    }

    if (!convDesc.aiEmployeeId) {
      await queryInterface.addColumn('conversations', 'aiEmployeeId', {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'ai_employees', key: 'id' },
        onDelete: 'CASCADE',
      });
    }

    if (!convDesc.leadId) {
      await queryInterface.addColumn('conversations', 'leadId', {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'leads', key: 'id' },
        onDelete: 'SET NULL',
      });
    }

    if (!convDesc.channel) {
      await queryInterface.addColumn('conversations', 'channel', {
        type: DataTypes.STRING(32),
        defaultValue: 'chat',
        allowNull: false,
      });
    }

    if (!convDesc.context) {
      await queryInterface.addColumn('conversations', 'context', {
        type: DataTypes.JSONB,
        defaultValue: {},
        allowNull: false,
      });
    }

    // 2. Create ai_memories table
    await queryInterface.createTable('ai_memories', {
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
        onDelete: 'CASCADE',
      },
      type: {
        type: DataTypes.STRING(32),
        allowNull: false,
      },
      key: {
        type: DataTypes.STRING(128),
        allowNull: false,
      },
      value: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      confidence: {
        type: DataTypes.FLOAT,
        defaultValue: 1.0,
        allowNull: false,
      },
      source: {
        type: DataTypes.STRING(64),
        defaultValue: MemorySource.CONVERSATION,
        allowNull: false,
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

    // 3. Create indexes for ai_memories
    await queryInterface.addIndex('ai_memories', ['organizationId'], { name: 'idx_ai_memories_org' });
    await queryInterface.addIndex('ai_memories', ['organizationId', 'aiEmployeeId'], { name: 'idx_ai_memories_org_employee' });
    await queryInterface.addIndex('ai_memories', ['organizationId', 'leadId'], { name: 'idx_ai_memories_org_lead' });
    await queryInterface.addIndex('ai_memories', ['type'], { name: 'idx_ai_memories_type' });
    await queryInterface.addIndex('ai_memories', ['createdAt'], { name: 'idx_ai_memories_created_at' });

    // 4. Create database-level partial unique indexes to safely enforce uniqueness with NULL and non-NULL leadId
    try {
      await sequelize.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_memories_unique_with_lead 
        ON ai_memories ("organizationId", "aiEmployeeId", "leadId", "key") 
        WHERE "leadId" IS NOT NULL;
      `);
      await sequelize.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_memories_unique_no_lead 
        ON ai_memories ("organizationId", "aiEmployeeId", "key") 
        WHERE "leadId" IS NULL;
      `);
    } catch (idxErr) {
      console.warn('Partial unique index creation notice:', (idxErr as Error).message);
    }
  },

  async down(queryInterface: QueryInterface, sequelize: Sequelize) {
    // 1. Drop unique indexes & table
    try {
      await sequelize.query(`DROP INDEX IF EXISTS idx_ai_memories_unique_with_lead;`);
      await sequelize.query(`DROP INDEX IF EXISTS idx_ai_memories_unique_no_lead;`);
    } catch (e) {}

    await queryInterface.dropTable('ai_memories');
  },
};
