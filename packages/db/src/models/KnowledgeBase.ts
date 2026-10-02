import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../client';
import { KnowledgeStatus } from '@cryptonion/shared';

export interface KnowledgeBaseAttributes {
  id: string;
  organizationId: string;
  aiEmployeeId?: string | null;
  name: string;
  description?: string | null;
  status: KnowledgeStatus;
  chunkCount: number;
  metadata: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

export type KnowledgeBaseCreationAttributes = Optional<
  KnowledgeBaseAttributes, 
  'id' | 'aiEmployeeId' | 'description' | 'status' | 'chunkCount' | 'metadata'
>;

export class KnowledgeBase extends Model<KnowledgeBaseAttributes, KnowledgeBaseCreationAttributes> implements KnowledgeBaseAttributes {
  public id!: string;
  public organizationId!: string;
  public aiEmployeeId!: string | null;
  public name!: string;
  public description!: string | null;
  public status!: KnowledgeStatus;
  public chunkCount!: number;
  public metadata!: Record<string, any>;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

KnowledgeBase.init(
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
      type: DataTypes.ENUM(...Object.values(KnowledgeStatus)),
      defaultValue: KnowledgeStatus.READY,
      allowNull: false,
    },
    chunkCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'knowledge_bases',
    indexes: [
      { fields: ['organizationId'] },
      { fields: ['aiEmployeeId'] },
    ],
  }
);
