import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../client';
import { DocumentStatus } from '@cryptonion/shared';

export interface DocumentAttributes {
  id: string;
  organizationId: string;
  knowledgeBaseId: string;
  filename: string;
  mimeType: string;
  fileSize: number;
  checksum: string;
  status: DocumentStatus;
  chunkCount: number;
  errorMessage?: string | null;
  metadata: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

export type DocumentCreationAttributes = Optional<
  DocumentAttributes,
  'id' | 'status' | 'chunkCount' | 'errorMessage' | 'metadata' | 'createdAt' | 'updatedAt'
>;

export class Document extends Model<DocumentAttributes, DocumentCreationAttributes> implements DocumentAttributes {
  declare id: string;
  declare organizationId: string;
  declare knowledgeBaseId: string;
  declare filename: string;
  declare mimeType: string;
  declare fileSize: number;
  declare checksum: string;
  declare status: DocumentStatus;
  declare chunkCount: number;
  declare errorMessage: string | null;
  declare metadata: Record<string, any>;

  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Document.init(
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
    knowledgeBaseId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'knowledge_bases', key: 'id' },
      onDelete: 'CASCADE',
    },
    filename: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 255],
      },
    },
    mimeType: {
      type: DataTypes.STRING(128),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 128],
      },
    },
    fileSize: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 0,
      },
    },
    checksum: {
      type: DataTypes.STRING(64),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 64],
      },
    },
    status: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: DocumentStatus.PENDING,
      validate: {
        isIn: [Object.values(DocumentStatus)],
      },
    },
    chunkCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
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
  },
  {
    sequelize,
    tableName: 'documents',
    indexes: [
      { fields: ['organizationId'] },
      { fields: ['knowledgeBaseId'] },
      { fields: ['status'] },
      {
        name: 'idx_documents_org_kb',
        fields: ['organizationId', 'knowledgeBaseId'],
      },
    ],
  }
);
