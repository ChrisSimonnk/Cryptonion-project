import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../client';
import { MessageSender } from '@cryptonion/shared';

export interface MessageAttributes {
  id: string;
  conversationId: string;
  sender: MessageSender;
  content: string;
  audioUrl?: string | null;
  latencyMs?: number | null;
  metadata: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

export type MessageCreationAttributes = Optional<
  MessageAttributes, 
  'id' | 'audioUrl' | 'latencyMs' | 'metadata'
>;

export class Message extends Model<MessageAttributes, MessageCreationAttributes> implements MessageAttributes {
  public id!: string;
  public conversationId!: string;
  public sender!: MessageSender;
  public content!: string;
  public audioUrl!: string | null;
  public latencyMs!: number | null;
  public metadata!: Record<string, any>;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Message.init(
  {
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
      type: DataTypes.ENUM(...Object.values(MessageSender)),
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
  },
  {
    sequelize,
    tableName: 'messages',
    indexes: [
      { fields: ['conversationId'] },
      { fields: ['createdAt'] },
    ],
  }
);
