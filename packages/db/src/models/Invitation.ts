import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../client';
import { Role, InvitationStatus } from '@cryptonion/shared';

export interface InvitationAttributes {
  id: string;
  organizationId: string;
  email: string;
  role: Role;
  token: string;
  status: InvitationStatus;
  expiresAt: Date;
  invitedById: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type InvitationCreationAttributes = Optional<
  InvitationAttributes, 
  'id' | 'role' | 'status'
>;

export class Invitation extends Model<InvitationAttributes, InvitationCreationAttributes> implements InvitationAttributes {
  public id!: string;
  public organizationId!: string;
  public email!: string;
  public role!: Role;
  public token!: string;
  public status!: InvitationStatus;
  public expiresAt!: Date;
  public invitedById!: string;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Invitation.init(
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
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: { isEmail: true },
    },
    role: {
      type: DataTypes.ENUM(...Object.values(Role)),
      defaultValue: Role.AGENT,
      allowNull: false,
    },
    token: {
      type: DataTypes.STRING(128),
      allowNull: false,
      unique: true,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(InvitationStatus)),
      defaultValue: InvitationStatus.PENDING,
      allowNull: false,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    invitedById: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
  },
  {
    sequelize,
    tableName: 'invitations',
    indexes: [
      { unique: true, fields: ['token'] },
      { fields: ['organizationId', 'email'] },
      { fields: ['status'] },
    ],
  }
);
