import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../client';
import { Role, MembershipStatus } from '@cryptonion/shared';

export interface MembershipAttributes {
  id: string;
  userId: string;
  organizationId: string;
  role: Role;
  status: MembershipStatus;
  invitedBy?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export type MembershipCreationAttributes = Optional<
  MembershipAttributes, 
  'id' | 'role' | 'status' | 'invitedBy'
>;

export class Membership extends Model<MembershipAttributes, MembershipCreationAttributes> implements MembershipAttributes {
  public id!: string;
  public userId!: string;
  public organizationId!: string;
  public role!: Role;
  public status!: MembershipStatus;
  public invitedBy!: string | null;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Membership.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    organizationId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'organizations', key: 'id' },
      onDelete: 'CASCADE',
    },
    role: {
      type: DataTypes.ENUM(...Object.values(Role)),
      defaultValue: Role.AGENT,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(MembershipStatus)),
      defaultValue: MembershipStatus.ACTIVE,
      allowNull: false,
    },
    invitedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL',
    },
  },
  {
    sequelize,
    tableName: 'memberships',
    indexes: [
      { unique: true, fields: ['userId', 'organizationId'] },
      { fields: ['organizationId'] },
      { fields: ['status'] },
    ],
  }
);
