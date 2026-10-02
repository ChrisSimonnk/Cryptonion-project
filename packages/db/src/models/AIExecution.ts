import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../client';
import { AIExecutionStatus } from '@cryptonion/shared';

export interface AIExecutionAttributes {
  id: string;
  organizationId: string;
  aiEmployeeId: string;
  status: AIExecutionStatus;
  provider: string;
  model: string;
  prompt: string;
  response?: string | null;
  latencyMs?: number | null;
  tokensUsed?: number | null;
  error?: string | null;
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

export type AIExecutionCreationAttributes = Optional<
  AIExecutionAttributes,
  'id' | 'response' | 'latencyMs' | 'tokensUsed' | 'error' | 'metadata' | 'createdAt' | 'updatedAt'
>;

export class AIExecution
  extends Model<AIExecutionAttributes, AIExecutionCreationAttributes>
  implements AIExecutionAttributes
{
  public id!: string;
  public organizationId!: string;
  public aiEmployeeId!: string;
  public status!: AIExecutionStatus;
  public provider!: string;
  public model!: string;
  public prompt!: string;
  public response!: string | null;
  public latencyMs!: number | null;
  public tokensUsed!: number | null;
  public error!: string | null;
  public metadata!: Record<string, any>;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

AIExecution.init(
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
    status: {
      type: DataTypes.ENUM(...Object.values(AIExecutionStatus)),
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
  },
  {
    sequelize,
    tableName: 'ai_executions',
    indexes: [
      { fields: ['organizationId'] },
      { fields: ['aiEmployeeId'] },
      { fields: ['status'] },
      { fields: ['createdAt'] },
    ],
  }
);
