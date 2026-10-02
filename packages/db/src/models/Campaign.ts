import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../client';
import { CampaignStatus } from '@cryptonion/shared';

export interface CampaignAttributes {
  id: string;
  organizationId: string;
  aiEmployeeId: string;
  name: string;
  description?: string | null;
  status: CampaignStatus;
  scheduledAt?: Date | null;
  totalLeads: number;
  contactedLeads: number;
  successfulCalls: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export type CampaignCreationAttributes = Optional<
  CampaignAttributes, 
  'id' | 'description' | 'status' | 'scheduledAt' | 'totalLeads' | 'contactedLeads' | 'successfulCalls'
>;

export class Campaign extends Model<CampaignAttributes, CampaignCreationAttributes> implements CampaignAttributes {
  public id!: string;
  public organizationId!: string;
  public aiEmployeeId!: string;
  public name!: string;
  public description!: string | null;
  public status!: CampaignStatus;
  public scheduledAt!: Date | null;
  public totalLeads!: number;
  public contactedLeads!: number;
  public successfulCalls!: number;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Campaign.init(
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
    name: {
      type: DataTypes.STRING(128),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(CampaignStatus)),
      defaultValue: CampaignStatus.DRAFT,
      allowNull: false,
    },
    scheduledAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    totalLeads: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
    contactedLeads: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
    successfulCalls: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'campaigns',
    indexes: [
      { fields: ['organizationId'] },
      { fields: ['aiEmployeeId'] },
      { fields: ['status'] },
    ],
  }
);
