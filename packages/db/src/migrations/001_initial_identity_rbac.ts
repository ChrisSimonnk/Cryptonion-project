import { DataTypes, QueryInterface, Sequelize } from 'sequelize';
import { Migration } from './types';
import { Role, MembershipStatus, InvitationStatus } from '@cryptonion/shared';

export const migration001: Migration = {
  name: '001_initial_identity_rbac',

  async up(queryInterface: QueryInterface, sequelize: Sequelize) {
    // 1. organizations
    await queryInterface.createTable('organizations', {
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
        type: DataTypes.STRING(32),
        defaultValue: 'free',
        allowNull: false,
      },
      settings: {
        type: DataTypes.JSONB,
        defaultValue: {},
        allowNull: false,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    });

    // 2. users
    await queryInterface.createTable('users', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
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
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    });

    // 3. memberships
    await queryInterface.createTable('memberships', {
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
        type: DataTypes.STRING(32),
        defaultValue: Role.AGENT,
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING(32),
        defaultValue: MembershipStatus.ACTIVE,
        allowNull: false,
      },
      invitedBy: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    });

    await queryInterface.addIndex('memberships', ['userId', 'organizationId'], {
      unique: true,
      name: 'memberships_user_org_unique_idx',
    });

    // 4. invitations
    await queryInterface.createTable('invitations', {
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
      },
      role: {
        type: DataTypes.STRING(32),
        defaultValue: Role.AGENT,
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING(32),
        defaultValue: InvitationStatus.PENDING,
        allowNull: false,
      },
      token: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
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
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    });

    // 5. audit_logs
    await queryInterface.createTable('audit_logs', {
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
        type: DataTypes.STRING(45),
        allowNull: true,
      },
      userAgent: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    });

    await queryInterface.addIndex('audit_logs', ['organizationId'], { name: 'audit_logs_org_idx' });
    await queryInterface.addIndex('audit_logs', ['userId'], { name: 'audit_logs_user_idx' });
  },

  async down(queryInterface: QueryInterface) {
    await queryInterface.dropTable('audit_logs');
    await queryInterface.dropTable('invitations');
    await queryInterface.dropTable('memberships');
    await queryInterface.dropTable('users');
    await queryInterface.dropTable('organizations');
  },
};
