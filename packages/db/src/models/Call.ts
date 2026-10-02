import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../client';
import { CallDirection, CallStatus } from '@cryptonion/shared';

export interface CallAttributes {
  id: string;
  organizationId: string;
  aiEmployeeId: string;
  leadId?: string | null;
  campaignId?: string | null;
  direction: CallDirection;
  status: CallStatus;
  callerNumber: string;
  calleeNumber: string;
  durationSeconds: number;
  recordingUrl?: string | null;
  summary?: string | null;
  sentiment?: string | null;
  metadata: Record<string, any>;
  startedAt?: Date | null;
  endedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export type CallCreationAttributes = Optional<
  CallAttributes, 
  'id' | 'leadId' | 'campaignId' | 'status' | 'durationSeconds' | 'recordingUrl' | 'summary' | 'sentiment' | 'metadata' | 'startedAt' | 'endedAt'
>;

export class Call extends Model<CallAttributes, CallCreationAttributes> implements CallAttributes {
  public id!: string;
  public organizationId!: string;
  public aiEmployeeId!: string;
  public leadId!: string | null;
  public campaignId!: string | null;
  public direction!: CallDirection;
  public status!: CallStatus;
  public callerNumber!: string;
  public calleeNumber!: string;
  public durationSeconds!: number;
  public recordingUrl!: string | null;
  public summary!: string | null;
  public sentiment!: string | null;
  public metadata!: Record<string, any>;
  public startedAt!: Date | null;
  public endedAt!: Date | null;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Call.init(
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
      onDelete: 'SET NULL',
    },
    campaignId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'campaigns', key: 'id' },
      onDelete: 'SET NULL',
    },
    direction: {
      type: DataTypes.ENUM(...Object.values(CallDirection)),
      defaultValue: CallDirection.OUTBOUND,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(CallStatus)),
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
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
      allowNull: false,
    },
    startedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    endedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'calls',
    indexes: [
      { fields: ['organizationId'] },
      { fields: ['aiEmployeeId'] },
      { fields: ['leadId'] },
      { fields: ['status'] },
      { fields: ['createdAt'] },
    ],
  }
);
