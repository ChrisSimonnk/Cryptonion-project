import { describe, it, expect, vi } from 'vitest';
import { migration005 } from '../migrations/005_knowledge_and_rag';

describe('Migration 005: Knowledge & Document Schema (Phase 5A)', () => {
  it('executes up(), creates documents table, alters document_chunks, adds indexes, and down() cleanly rolls back', async () => {
    const createdTables: string[] = [];
    const addedColumns: string[] = [];
    const addedIndexes: string[] = [];
    const droppedTables: string[] = [];
    const removedColumns: string[] = [];
    const removedIndexes: string[] = [];

    const tableColumns: Record<string, Record<string, any>> = {
      document_chunks: { id: { type: 'UUID' }, content: { type: 'TEXT' } },
    };

    const mockQueryInterface: any = {
      describeTable: vi.fn(async (table: string) => {
        return tableColumns[table] || { id: { type: 'UUID' } };
      }),
      addColumn: vi.fn(async (table: string, colName: string, spec: any) => {
        addedColumns.push(`${table}.${colName}`);
        if (!tableColumns[table]) tableColumns[table] = {};
        tableColumns[table][colName] = spec;
      }),
      removeColumn: vi.fn(async (table: string, colName: string) => {
        removedColumns.push(`${table}.${colName}`);
        if (tableColumns[table]) delete tableColumns[table][colName];
      }),
      createTable: vi.fn(async (table: string, spec: any) => {
        createdTables.push(table);
      }),
      addIndex: vi.fn(async (table: string, cols: string[], opts: any) => {
        addedIndexes.push(opts?.name || `${table}_idx`);
      }),
      removeIndex: vi.fn(async (table: string, indexName: string) => {
        removedIndexes.push(indexName);
      }),
      dropTable: vi.fn(async (table: string) => {
        droppedTables.push(table);
      }),
    };

    const mockSequelize: any = {
      query: vi.fn(async () => []),
    };

    // 1. Run up()
    await migration005.up(mockQueryInterface, mockSequelize);

    expect(createdTables).toContain('documents');
    expect(addedColumns).toContain('document_chunks.documentId');
    expect(addedColumns).toContain('document_chunks.chunkIndex');
    expect(addedColumns).toContain('document_chunks.pageNumber');
    expect(addedIndexes).toContain('idx_documents_org_kb');
    expect(addedIndexes).toContain('idx_document_chunks_kb');
    expect(addedIndexes).toContain('idx_document_chunks_doc');
    expect(mockSequelize.query).toHaveBeenCalledWith('CREATE EXTENSION IF NOT EXISTS vector;');

    // 2. Run down()
    await migration005.down(mockQueryInterface, mockSequelize);

    expect(droppedTables).toContain('documents');
    expect(removedColumns).toContain('document_chunks.documentId');
    expect(removedColumns).toContain('document_chunks.chunkIndex');
    expect(removedColumns).toContain('document_chunks.pageNumber');
    expect(mockSequelize.query).toHaveBeenCalledWith('DROP INDEX IF EXISTS idx_document_chunks_embedding_hnsw;');
  });
});
