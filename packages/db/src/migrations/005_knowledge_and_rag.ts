import { DataTypes, QueryInterface, Sequelize } from 'sequelize';
import { Migration } from './types';
import { DocumentStatus } from '@cryptonion/shared';
import { VECTOR_DIMENSION } from '../models/DocumentChunk';

export const migration005: Migration = {
  name: '005_knowledge_and_rag',

  async up(queryInterface: QueryInterface, sequelize: Sequelize) {
    // 1. Create documents table
    await queryInterface.createTable('documents', {
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
      knowledgeBaseId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'knowledge_bases', key: 'id' },
        onDelete: 'CASCADE',
      },
      filename: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      mimeType: {
        type: DataTypes.STRING(128),
        allowNull: false,
      },
      fileSize: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      checksum: {
        type: DataTypes.STRING(64),
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING(32),
        defaultValue: DocumentStatus.PENDING,
        allowNull: false,
      },
      chunkCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
      },
      errorMessage: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      metadata: {
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

    // 2. Add indexes on documents table
    await queryInterface.addIndex('documents', ['organizationId'], { name: 'idx_documents_org' });
    await queryInterface.addIndex('documents', ['knowledgeBaseId'], { name: 'idx_documents_kb' });
    await queryInterface.addIndex('documents', ['status'], { name: 'idx_documents_status' });
    await queryInterface.addIndex('documents', ['organizationId', 'knowledgeBaseId'], {
      name: 'idx_documents_org_kb',
    });

    // 3. Alter document_chunks table to add documentId, chunkIndex, pageNumber
    const chunkCols = await queryInterface.describeTable('document_chunks').catch(() => ({} as any));

    if (!chunkCols.documentId) {
      await queryInterface.addColumn('document_chunks', 'documentId', {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'documents', key: 'id' },
        onDelete: 'CASCADE',
      });
    }

    if (!chunkCols.chunkIndex) {
      await queryInterface.addColumn('document_chunks', 'chunkIndex', {
        type: DataTypes.INTEGER,
        allowNull: true,
      });
    }

    if (!chunkCols.pageNumber) {
      await queryInterface.addColumn('document_chunks', 'pageNumber', {
        type: DataTypes.INTEGER,
        allowNull: true,
      });
    }

    // 4. Add indexes on document_chunks table
    try {
      await queryInterface.addIndex('document_chunks', ['knowledgeBaseId'], {
        name: 'idx_document_chunks_kb',
      });
    } catch (e) {}

    try {
      await queryInterface.addIndex('document_chunks', ['documentId'], {
        name: 'idx_document_chunks_doc',
      });
    } catch (e) {}

    // 5. Ensure pgvector extension and HNSW vector index if supported
    try {
      await sequelize.query('CREATE EXTENSION IF NOT EXISTS vector;');
      await sequelize.query(`
        DO $$
        BEGIN
          IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
            BEGIN
              ALTER TABLE document_chunks ALTER COLUMN embedding TYPE vector(${VECTOR_DIMENSION}) USING embedding::vector(${VECTOR_DIMENSION});
            EXCEPTION WHEN OTHERS THEN NULL;
            END;
            BEGIN
              CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding_hnsw 
              ON document_chunks USING hnsw (embedding vector_cosine_ops);
            EXCEPTION WHEN OTHERS THEN NULL;
            END;
          END IF;
        END $$;
      `);
    } catch (e) {}
  },

  async down(queryInterface: QueryInterface, sequelize: Sequelize) {
    // 0. Drop vector index if exists
    try {
      await sequelize.query('DROP INDEX IF EXISTS idx_document_chunks_embedding_hnsw;');
    } catch (e) {}

    // 1. Remove indexes and columns from document_chunks
    try {
      await queryInterface.removeIndex('document_chunks', 'idx_document_chunks_doc');
    } catch (e) {}

    try {
      await queryInterface.removeIndex('document_chunks', 'idx_document_chunks_kb');
    } catch (e) {}

    const chunkCols = await queryInterface.describeTable('document_chunks').catch(() => ({} as any));
    if (chunkCols.documentId) {
      await queryInterface.removeColumn('document_chunks', 'documentId');
    }
    if (chunkCols.chunkIndex) {
      await queryInterface.removeColumn('document_chunks', 'chunkIndex');
    }
    if (chunkCols.pageNumber) {
      await queryInterface.removeColumn('document_chunks', 'pageNumber');
    }

    // 2. Drop documents table
    await queryInterface.dropTable('documents');
  },
};
