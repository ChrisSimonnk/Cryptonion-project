import { DataTypes, QueryInterface, Sequelize } from 'sequelize';
import { sequelize } from '../client';
import { Migration, MigrationStatus } from './types';
import { migration001 } from './001_initial_identity_rbac';
import { migration002 } from './002_ai_employee_core';
import { migration003 } from './003_campaigns_leads_telephony';
import { migration004 } from './004_memory_and_context';
import { migration005 } from './005_knowledge_and_rag';

export const ALL_MIGRATIONS: Migration[] = [
  migration001,
  migration002,
  migration003,
  migration004,
  migration005,
];

export class MigrationRunner {
  private queryInterface: QueryInterface;
  private seq: Sequelize;
  private migrations: Migration[];
  private tableName: string;

  constructor(seq: Sequelize = sequelize, migrations: Migration[] = ALL_MIGRATIONS, tableName: string = '_migrations') {
    this.seq = seq;
    this.queryInterface = seq.getQueryInterface();
    this.migrations = migrations;
    this.tableName = tableName;
  }

  async ensureMigrationTable(): Promise<void> {
    const tableExists = await this.queryInterface.tableExists(this.tableName);
    if (!tableExists) {
      await this.queryInterface.createTable(this.tableName, {
        name: {
          type: DataTypes.STRING(255),
          primaryKey: true,
          allowNull: false,
        },
        executedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      });
    }
  }

  async getExecutedMigrations(): Promise<string[]> {
    await this.ensureMigrationTable();
    try {
      const records = await this.seq.query<{ name: string }>(
        `SELECT name FROM "${this.tableName}" ORDER BY "executedAt" ASC, name ASC;`,
        { type: 'SELECT' as any }
      );
      return records.map((r) => r.name);
    } catch {
      return [];
    }
  }

  async getPendingMigrations(): Promise<Migration[]> {
    const executed = await this.getExecutedMigrations();
    return this.migrations.filter((m) => !executed.includes(m.name));
  }

  async status(): Promise<MigrationStatus> {
    const executed = await this.getExecutedMigrations();
    const pending = this.migrations.filter((m) => !executed.includes(m.name)).map((m) => m.name);
    return { executed, pending };
  }

  async up(): Promise<string[]> {
    await this.ensureMigrationTable();
    const pending = await this.getPendingMigrations();
    const applied: string[] = [];

    for (const migration of pending) {
      console.log(`[MigrationRunner] Applying migration: ${migration.name}...`);
      await migration.up(this.queryInterface, this.seq);
      await this.seq.query(
        `INSERT INTO "${this.tableName}" (name, "executedAt") VALUES (:name, :executedAt);`,
        {
          replacements: { name: migration.name, executedAt: new Date() },
          type: 'INSERT' as any,
        }
      );
      applied.push(migration.name);
      console.log(`[MigrationRunner] Applied migration: ${migration.name}`);
    }

    return applied;
  }

  async down(): Promise<string | null> {
    await this.ensureMigrationTable();
    const executed = await this.getExecutedMigrations();
    if (executed.length === 0) {
      console.log('[MigrationRunner] No migrations to roll back.');
      return null;
    }

    const lastExecutedName = executed[executed.length - 1];
    const migration = this.migrations.find((m) => m.name === lastExecutedName);

    if (!migration) {
      throw new Error(`Migration ${lastExecutedName} not found in registered migrations.`);
    }

    console.log(`[MigrationRunner] Rolling back migration: ${migration.name}...`);
    await migration.down(this.queryInterface, this.seq);
    await this.seq.query(
      `DELETE FROM "${this.tableName}" WHERE name = :name;`,
      {
        replacements: { name: migration.name },
        type: 'DELETE' as any,
      }
    );
    console.log(`[MigrationRunner] Rolled back migration: ${migration.name}`);
    return migration.name;
  }

  async reset(): Promise<string[]> {
    const rolledBack: string[] = [];
    while (true) {
      const undone = await this.down();
      if (!undone) break;
      rolledBack.push(undone);
    }
    return rolledBack;
  }
}

export const migrationRunner = new MigrationRunner();
