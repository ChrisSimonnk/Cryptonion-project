import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../client';

export interface OrganizationAttributes {
  id: string;
  name: string;
  slug: string;
  plan: string;
  settings: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

export type OrganizationCreationAttributes = Optional<OrganizationAttributes, 'id' | 'settings'>;

export class Organization extends Model<OrganizationAttributes, OrganizationCreationAttributes> implements OrganizationAttributes {
  public id!: string;
  public name!: string;
  public slug!: string;
  public plan!: string;
  public settings!: Record<string, any>;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Organization.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(128),
      allowNull: false,
    },
    slug: {
      type: DataTypes.STRING(128),
      allowNull: false,
      unique: true,
    },
    plan: {
      type: DataTypes.STRING(64),
      defaultValue: 'starter',
      allowNull: false,
    },
    settings: {
      type: DataTypes.JSONB,
      defaultValue: {},
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'organizations',
    indexes: [{ unique: true, fields: ['slug'] }],
  }
);
