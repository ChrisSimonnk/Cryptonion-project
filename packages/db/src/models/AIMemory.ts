import { DataTypes, Model, Optional, Op } from 'sequelize';
import { sequelize } from '../client';
import { MemoryType, MemorySource } from '@cryptonion/shared';

export interface AIMemoryAttributes {
  id: string;
  organizationId: string;
  aiEmployeeId: string;
  leadId?: string | null;
  type: MemoryType;
  key: string;
  value: string;
  confidence: number;
  source: MemorySource;
  metadata: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

export type AIMemoryCreationAttributes = Optional<
  AIMemoryAttributes,
  'id' | 'leadId' | 'confidence' | 'source' | 'metadata' | 'createdAt' | 'updatedAt'
>;

export class AIMemory extends Model<AIMemoryAttributes, AIMemoryCreationAttributes> implements AIMemoryAttributes {
  declare id: string;
  declare organizationId: string;
  declare aiEmployeeId: string;
  declare leadId: string | null;
  declare type: MemoryType;
  declare key: string;
  declare value: string;
  declare confidence: number;
  declare source: MemorySource;
  declare metadata: Record<string, any>;

  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

AIMemory.init(
  {
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
      validate: {
        isIn: [Object.values(MemoryType)],
      },
    },
    key: {
      type: DataTypes.STRING(128),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 128],
      },
    },
    value: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 2000],
      },
    },
    confidence: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 1.0,
      validate: {
        min: 0.0,
        max: 1.0,
      },
    },
    source: {
      type: DataTypes.STRING(64),
      allowNull: false,
      defaultValue: MemorySource.CONVERSATION,
      validate: {
        isIn: [Object.values(MemorySource)],
      },
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'ai_memories',
    indexes: [
      { fields: ['organizationId'] },
      { fields: ['aiEmployeeId'] },
      { fields: ['leadId'] },
      { fields: ['type'] },
      { fields: ['key'] },
      {
        name: 'idx_ai_memories_unique_with_lead',
        unique: true,
        fields: ['organizationId', 'aiEmployeeId', 'leadId', 'key'],
        where: {
          leadId: { [Op.ne]: null },
        },
      },
      {
        name: 'idx_ai_memories_unique_no_lead',
        unique: true,
        fields: ['organizationId', 'aiEmployeeId', 'key'],
        where: {
          leadId: null,
        },
      },
    ],
  }
);
