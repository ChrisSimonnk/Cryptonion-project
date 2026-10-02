import { describe, it, expect, vi } from 'vitest';
import { MigrationRunner, ALL_MIGRATIONS } from '../migrations/runner';
import { Migration } from '../migrations/types';

describe('Database Migration Infrastructure', () => {
  it('tracks ordered migrations, applies up(), rolls back down(), and re-applies cleanly', async () => {
    const executedInDb: Array<{ name: string; executedAt: Date }> = [];
    const migrationLog: string[] = [];

    const mockQueryInterface: any = {
      tableExists: vi.fn(async (tbl: string) => true),
      createTable: vi.fn(async (tbl: string, cols: any) => {}),
      dropTable: vi.fn(async (tbl: string) => {}),
      addIndex: vi.fn(async () => {}),
    };

    const mockSeq: any = {
      getQueryInterface: () => mockQueryInterface,
      query: vi.fn(async (sql: string, opts: any) => {
        if (sql.includes('SELECT name FROM')) {
          return executedInDb.map((e) => ({ name: e.name }));
        }
        if (sql.includes('INSERT INTO')) {
          const name = opts?.replacements?.name;
          executedInDb.push({ name, executedAt: opts?.replacements?.executedAt || new Date() });
          return [];
        }
        if (sql.includes('DELETE FROM')) {
          const name = opts?.replacements?.name;
          const idx = executedInDb.findIndex((e) => e.name === name);
          if (idx !== -1) executedInDb.splice(idx, 1);
          return [];
        }
        return [];
      }),
    };

    const mockMigrations: Migration[] = [
      {
        name: '001_test_identity',
        up: vi.fn(async () => {
          migrationLog.push('UP:001');
        }),
        down: vi.fn(async () => {
          migrationLog.push('DOWN:001');
        }),
      },
      {
        name: '002_test_ai_core',
        up: vi.fn(async () => {
          migrationLog.push('UP:002');
        }),
        down: vi.fn(async () => {
          migrationLog.push('DOWN:002');
        }),
      },
    ];

    const runner = new MigrationRunner(mockSeq, mockMigrations, '_test_migrations');

    // 1. Initial status: 2 pending, 0 executed
    const initialStatus = await runner.status();
    expect(initialStatus.executed).toEqual([]);
    expect(initialStatus.pending).toEqual(['001_test_identity', '002_test_ai_core']);

    // 2. Execute up()
    const applied = await runner.up();
    expect(applied).toEqual(['001_test_identity', '002_test_ai_core']);
    expect(migrationLog).toEqual(['UP:001', 'UP:002']);

    const afterUpStatus = await runner.status();
    expect(afterUpStatus.executed).toEqual(['001_test_identity', '002_test_ai_core']);
    expect(afterUpStatus.pending).toEqual([]);

    // 3. Rollback down() - should roll back 002
    const rolledBack = await runner.down();
    expect(rolledBack).toBe('002_test_ai_core');
    expect(migrationLog).toEqual(['UP:001', 'UP:002', 'DOWN:002']);

    const afterDownStatus = await runner.status();
    expect(afterDownStatus.executed).toEqual(['001_test_identity']);
    expect(afterDownStatus.pending).toEqual(['002_test_ai_core']);

    // 4. Re-apply up() - should re-apply 002
    const reApplied = await runner.up();
    expect(reApplied).toEqual(['002_test_ai_core']);
    expect(migrationLog).toEqual(['UP:001', 'UP:002', 'DOWN:002', 'UP:002']);

    const finalStatus = await runner.status();
    expect(finalStatus.executed).toEqual(['001_test_identity', '002_test_ai_core']);
    expect(finalStatus.pending).toEqual([]);
  });

  it('includes all migrations in ALL_MIGRATIONS list in correct sequential order', () => {
    const names = ALL_MIGRATIONS.map((m) => m.name);
    expect(names).toEqual([
      '001_initial_identity_rbac',
      '002_ai_employee_core',
      '003_campaigns_leads_telephony',
      '004_memory_and_context',
      '005_knowledge_and_rag',
    ]);
  });
});

