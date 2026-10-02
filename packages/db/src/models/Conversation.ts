import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../client';

export interface ConversationAttributes {
  id: string;
  organizationId: string;
  callId?: string | null;
  aiEmployeeId: string;
  leadId?: string | null;
  channel: 'voice' | 'chat' | 'sms' | 'whatsapp';
  context: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

export type ConversationCreationAttributes = Optional<
  ConversationAttributes, 
  'id' | 'callId' | 'leadId' | 'channel' | 'context'
>;

export class Conversation extends Model<ConversationAttributes, ConversationCreationAttributes> implements ConversationAttributes {
  public id!: string;
  public organizationId!: string;
  public callId!: string | null;
  public aiEmployeeId!: string;
  public leadId!: string | null;
  public channel!: 'voice' | 'chat' | 'sms' | 'whatsapp';
  public context!: Record<string, any>;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Conversation.init(
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
    callId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'calls', key: 'id' },
      onDelete: 'SET NULL',
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
    channel: {
      type: DataTypes.STRING(32),
      defaultValue: 'voice',
      allowNull: false,
    },
    context: {
      type: DataTypes.JSONB,
      defaultValue: {},
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'conversations',
    indexes: [
      { fields: ['organizationId'] },
      { fields: ['callId'] },
      { fields: ['aiEmployeeId'] },
    ],
  }
);
