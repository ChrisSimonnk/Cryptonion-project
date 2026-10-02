import { DataTypes, QueryInterface, Sequelize } from 'sequelize';
import { Migration } from './types';
import { EmployeeRole, EmployeeStatus, AIExecutionStatus } from '@cryptonion/shared';

export const migration002: Migration = {
  name: '002_ai_employee_core',

  async up(queryInterface: QueryInterface, sequelize: Sequelize) {
    // 1. ai_employees table
    await queryInterface.createTable('ai_employees', {
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
      name: {
        type: DataTypes.STRING(128),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      avatarUrl: {
        type: DataTypes.STRING(512),
        allowNull: true,
      },
      role: {
        type: DataTypes.STRING(32),
        defaultValue: EmployeeRole.SALES_REP,
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING(32),
        defaultValue: EmployeeStatus.ACTIVE,
        allowNull: false,
      },
      voiceConfig: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {
          provider: 'piper',
          voiceId: 'en_US-lessac-medium',
          speed: 1.0,
          pitch: 1.0,
        },
      },
      llmConfig: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {
          provider: 'ollama',
          model: 'llama3:8b',
          temperature: 0.7,
          maxTokens: 512,
          systemPrompt: 'You are an autonomous AI employee. Be concise, polite, and helpful.',
        },
      },
      tools: {
        type: DataTypes.JSONB,
        defaultValue: [],
        allowNull: false,
      },
      phoneNumber: {
        type: DataTypes.STRING(32),
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

    await queryInterface.addIndex('ai_employees', ['organizationId'], {
      name: 'ai_employees_org_idx',
    });
    await queryInterface.addIndex('ai_employees', ['status'], {
      name: 'ai_employees_status_idx',
    });

    // 2. ai_executions table
    await queryInterface.createTable('ai_executions', {
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
      status: {
        type: DataTypes.STRING(32),
        defaultValue: AIExecutionStatus.QUEUED,
        allowNull: false,
      },
      provider: {
        type: DataTypes.STRING(64),
        allowNull: false,
      },
      model: {
        type: DataTypes.STRING(128),
        allowNull: false,
      },
      prompt: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      response: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      latencyMs: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      tokensUsed: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      error: {
        type: DataTypes.TEXT,
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

    await queryInterface.addIndex('ai_executions', ['organizationId'], {
      name: 'ai_executions_org_idx',
    });
    await queryInterface.addIndex('ai_executions', ['aiEmployeeId'], {
      name: 'ai_executions_employee_idx',
    });
    await queryInterface.addIndex('ai_executions', ['status'], {
      name: 'ai_executions_status_idx',
    });
    await queryInterface.addIndex('ai_executions', ['createdAt'], {
      name: 'ai_executions_created_idx',
    });
  },

  async down(queryInterface: QueryInterface) {
    await queryInterface.dropTable('ai_executions');
    await queryInterface.dropTable('ai_employees');
  },
};
