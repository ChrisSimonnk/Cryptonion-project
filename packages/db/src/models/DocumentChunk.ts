import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../client';

export const VECTOR_DIMENSION = parseInt(process.env.VECTOR_DIMENSION || '1536', 10);

export interface DocumentChunkAttributes {
  id: string;
  knowledgeBaseId: string;
  documentId?: string | null;
  chunkIndex?: number | null;
  pageNumber?: number | null;
  content: string;
  metadata: Record<string, any>;
  embedding?: number[] | string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export type DocumentChunkCreationAttributes = Optional<
  DocumentChunkAttributes, 
  'id' | 'documentId' | 'chunkIndex' | 'pageNumber' | 'metadata' | 'embedding' | 'createdAt' | 'updatedAt'
>;

export class DocumentChunk extends Model<DocumentChunkAttributes, DocumentChunkCreationAttributes> implements DocumentChunkAttributes {
  declare id: string;
  declare knowledgeBaseId: string;
  declare documentId: string | null;
  declare chunkIndex: number | null;
  declare pageNumber: number | null;
  declare content: string;
  declare metadata: Record<string, any>;
  declare embedding: number[] | string | null;

  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

DocumentChunk.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    knowledgeBaseId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'knowledge_bases', key: 'id' },
      onDelete: 'CASCADE',
    },
    documentId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'documents', key: 'id' },
      onDelete: 'CASCADE',
    },
    chunkIndex: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    pageNumber: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
      allowNull: false,
    },
    embedding: {
      type: `vector(${VECTOR_DIMENSION})`,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'document_chunks',
    indexes: [
      {
        name: 'idx_document_chunks_kb',
        fields: ['knowledgeBaseId'],
      },
      {
        name: 'idx_document_chunks_doc',
        fields: ['documentId'],
      },
    ],
  }
);
