import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../client';

export interface AuditLogAttributes {
  id: string;
  organizationId?: string | null;
  userId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  details: Record<string, any>;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export type AuditLogCreationAttributes = Optional<
  AuditLogAttributes, 
  'id' | 'organizationId' | 'userId' | 'resourceId' | 'details' | 'ipAddress' | 'userAgent'
>;

export class AuditLog extends Model<AuditLogAttributes, AuditLogCreationAttributes> implements AuditLogAttributes {
  public id!: string;
  public organizationId!: string | null;
  public userId!: string | null;
  public action!: string;
  public resourceType!: string;
  public resourceId!: string | null;
  public details!: Record<string, any>;
  public ipAddress!: string | null;
  public userAgent!: string | null;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

AuditLog.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    organizationId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'organizations', key: 'id' },
      onDelete: 'SET NULL',
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL',
    },
    action: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },
    resourceType: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },
    resourceId: {
      type: DataTypes.STRING(128),
      allowNull: true,
    },
    details: {
      type: DataTypes.JSONB,
      defaultValue: {},
      allowNull: false,
    },
    ipAddress: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    userAgent: {
      type: DataTypes.STRING(512),
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'audit_logs',
    indexes: [
      { fields: ['organizationId', 'createdAt'] },
      { fields: ['userId'] },
      { fields: ['action'] },
    ],
  }
);
