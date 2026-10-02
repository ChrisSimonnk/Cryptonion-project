import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../client';
import { LeadStatus } from '@cryptonion/shared';

export interface LeadAttributes {
  id: string;
  organizationId: string;
  campaignId?: string | null;
  firstName: string;
  lastName?: string | null;
  phoneNumber: string;
  email?: string | null;
  status: LeadStatus;
  customData: Record<string, any>;
  lastContactedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export type LeadCreationAttributes = Optional<
  LeadAttributes, 
  'id' | 'campaignId' | 'lastName' | 'email' | 'status' | 'customData' | 'lastContactedAt'
>;

export class Lead extends Model<LeadAttributes, LeadCreationAttributes> implements LeadAttributes {
  public id!: string;
  public organizationId!: string;
  public campaignId!: string | null;
  public firstName!: string;
  public lastName!: string | null;
  public phoneNumber!: string;
  public email!: string | null;
  public status!: LeadStatus;
  public customData!: Record<string, any>;
  public lastContactedAt!: Date | null;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Lead.init(
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
      type: DataTypes.ENUM(...Object.values(LeadStatus)),
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
  },
  {
    sequelize,
    tableName: 'leads',
    indexes: [
      { fields: ['organizationId'] },
      { fields: ['campaignId'] },
      { fields: ['phoneNumber'] },
      { fields: ['status'] },
    ],
  }
);
