import { describe, it, expect, vi } from 'vitest';
import { migration004 } from '../migrations/004_memory_and_context';

describe('Migration 004: Memory & Context Schema', () => {
  it('executes up(), creates ai_memories and indexes, and down() drops them cleanly', async () => {
    const createdTables: string[] = [];
    const addedColumns: string[] = [];
    const addedIndexes: string[] = [];
    const droppedTables: string[] = [];
    const rawQueries: string[] = [];

    const mockQueryInterface: any = {
      describeTable: vi.fn(async (table: string) => {
        return { id: { type: 'UUID' } };
      }),
      addColumn: vi.fn(async (table: string, colName: string, spec: any) => {
        addedColumns.push(`${table}.${colName}`);
      }),
      createTable: vi.fn(async (table: string, spec: any) => {
        createdTables.push(table);
      }),
      addIndex: vi.fn(async (table: string, cols: string[], opts: any) => {
        addedIndexes.push(opts?.name || `${table}_idx`);
      }),
      dropTable: vi.fn(async (table: string) => {
        droppedTables.push(table);
      }),
    };

    const mockSequelize: any = {
      query: vi.fn(async (sql: string) => {
        rawQueries.push(sql);
        return [];
      }),
    };

    // 1. Run up()
    await migration004.up(mockQueryInterface, mockSequelize);

    expect(createdTables).toContain('ai_memories');
    expect(addedColumns).toContain('conversations.organizationId');
    expect(addedColumns).toContain('conversations.aiEmployeeId');
    expect(addedColumns).toContain('conversations.channel');
    expect(addedColumns).toContain('conversations.context');
    expect(addedIndexes).toContain('idx_ai_memories_org');
    expect(addedIndexes).toContain('idx_ai_memories_org_employee');

    // Verify partial unique indexes were created
    const hasLeadUniqueIdx = rawQueries.some((q) => q.includes('idx_ai_memories_unique_with_lead'));
    const hasNoLeadUniqueIdx = rawQueries.some((q) => q.includes('idx_ai_memories_unique_no_lead'));
    expect(hasLeadUniqueIdx).toBe(true);
    expect(hasNoLeadUniqueIdx).toBe(true);

    // 2. Run down()
    await migration004.down(mockQueryInterface, mockSequelize);

    expect(droppedTables).toContain('ai_memories');
  });
});
