import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../client';
import { 
  EmployeeRole, 
  EmployeeStatus, 
  AIEmployeeVoiceConfig, 
  AIEmployeeLLMConfig, 
  AIEmployeeToolConfig 
} from '@cryptonion/shared';

export interface AIEmployeeAttributes {
  id: string;
  organizationId: string;
  name: string;
  description?: string | null;
  avatarUrl?: string | null;
  role: EmployeeRole;
  status: EmployeeStatus;
  voiceConfig: AIEmployeeVoiceConfig;
  llmConfig: AIEmployeeLLMConfig;
  tools: AIEmployeeToolConfig[];
  phoneNumber?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export type AIEmployeeCreationAttributes = Optional<
  AIEmployeeAttributes, 
  'id' | 'description' | 'avatarUrl' | 'role' | 'status' | 'tools' | 'phoneNumber'
>;

export class AIEmployee extends Model<AIEmployeeAttributes, AIEmployeeCreationAttributes> implements AIEmployeeAttributes {
  public id!: string;
  public organizationId!: string;
  public name!: string;
  public description!: string | null;
  public avatarUrl!: string | null;
  public role!: EmployeeRole;
  public status!: EmployeeStatus;
  public voiceConfig!: AIEmployeeVoiceConfig;
  public llmConfig!: AIEmployeeLLMConfig;
  public tools!: AIEmployeeToolConfig[];
  public phoneNumber!: string | null;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

AIEmployee.init(
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
      type: DataTypes.ENUM(...Object.values(EmployeeRole)),
      defaultValue: EmployeeRole.SALES_REP,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(EmployeeStatus)),
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
  },
  {
    sequelize,
    tableName: 'ai_employees',
    indexes: [
      { fields: ['organizationId'] },
      { fields: ['status'] },
    ],
  }
);
