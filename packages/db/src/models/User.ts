import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../client';

export interface UserAttributes {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  avatarUrl?: string | null;
  isActive: boolean;
  lastLoginAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export type UserCreationAttributes = Optional<UserAttributes, 'id' | 'avatarUrl' | 'isActive' | 'lastLoginAt'>;

export class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: string;
  public email!: string;
  public passwordHash!: string;
  public name!: string;
  public avatarUrl!: string | null;
  public isActive!: boolean;
  public lastLoginAt!: Date | null;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
    },
    passwordHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(128),
      allowNull: false,
    },
    avatarUrl: {
      type: DataTypes.STRING(512),
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
    },
    lastLoginAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'users',
    indexes: [{ unique: true, fields: ['email'] }],
  }
);
