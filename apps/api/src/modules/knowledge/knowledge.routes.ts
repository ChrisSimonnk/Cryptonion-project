import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { KnowledgeBaseCreateSchema, KnowledgeStatus, Role } from '@cryptonion/shared';
import { KnowledgeBase, DocumentChunk, AIEmployee, Document } from '@cryptonion/db';
import { DocumentIngestionService } from './document.service';

export default async function knowledgeRoutes(fastify: FastifyInstance) {
  const typedFastify = fastify.withTypeProvider<ZodTypeProvider>();

  // 1. List Knowledge Bases
  typedFastify.get(
    '/api/knowledge',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Knowledge Base & RAG'],
        summary: 'List Knowledge Bases',
      },
    },
    async (request, reply) => {
      const { organizationId } = request.user;
      const bases = await KnowledgeBase.findAll({
        where: { organizationId },
        order: [['createdAt', 'DESC']],
      });

      return reply.send({
        success: true,
        data: bases,
      });
    }
  );

  // 2. Create Knowledge Base (RBAC: Admin / Manager)
  typedFastify.post(
    '/api/knowledge',
    {
      preHandler: [fastify.requireRole([Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER])],
      schema: {
        tags: ['Knowledge Base & RAG'],
        summary: 'Create Knowledge Base Container (Admin/Manager)',
        body: KnowledgeBaseCreateSchema.extend({
          aiEmployeeId: z.string().uuid().optional(),
        }),
      },
    },
    async (request, reply) => {
      const { organizationId } = request.user;
      const { name, description, aiEmployeeId } = request.body;

      if (aiEmployeeId) {
        const employee = await AIEmployee.findOne({
          where: { id: aiEmployeeId, organizationId },
        });
        if (!employee) {
          return reply.status(404).send({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Assigned AI Employee not found in your organization' },
          });
        }
      }

      const kb = await KnowledgeBase.create({
        organizationId,
        aiEmployeeId: aiEmployeeId || null,
        name,
        description,
        status: KnowledgeStatus.READY,
        chunkCount: 0,
        metadata: {},
      });

      return reply.status(201).send({
        success: true,
        data: kb,
      });
    }
  );

  // 3. Document Ingestion via Text/Content (Phase 5B)
  typedFastify.post(
    '/api/knowledge/:id/documents',
    {
      preHandler: [fastify.requireRole([Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER])],
      schema: {
        tags: ['Knowledge Base & RAG'],
        summary: 'Ingest Document Content & Perform Deterministic Chunking (Phase 5B)',
        params: z.object({ id: z.string().uuid() }),
        body: z.object({
          filename: z.string().min(1).max(255),
          mimeType: z.string().min(1).max(128).default('text/plain'),
          content: z.string().min(1),
          metadata: z.record(z.any()).optional(),
        }),
      },
    },
    async (request, reply) => {
      const { organizationId } = request.user;
      const { id: knowledgeBaseId } = request.params;
      const { filename, mimeType, content, metadata } = request.body;

      const fileBuffer = Buffer.from(content, 'utf-8');

      try {
        const doc = await DocumentIngestionService.ingestDocument({
          organizationId,
          knowledgeBaseId,
          filename,
          mimeType,
          fileBuffer,
          metadata,
        });

        return reply.status(201).send({
          success: true,
          data: doc,
        });
      } catch (err: any) {
        const msg = err.message || 'Document ingestion failed';
        const code = msg.startsWith('FILE_TOO_LARGE')
          ? 'FILE_TOO_LARGE'
          : msg.startsWith('UNSUPPORTED_MIME_TYPE')
          ? 'UNSUPPORTED_MIME_TYPE'
          : msg.startsWith('NOT_FOUND')
          ? 'NOT_FOUND'
          : 'INGESTION_FAILED';

        const statusCode = code === 'NOT_FOUND' ? 404 : code === 'FILE_TOO_LARGE' || code === 'UNSUPPORTED_MIME_TYPE' ? 400 : 422;

        return reply.status(statusCode).send({
          success: false,
          error: { code, message: msg },
        });
      }
    }
  );

  // 4. Document Ingestion via File Upload (Multipart) (Phase 5B)
  typedFastify.post(
    '/api/knowledge/:id/documents/upload',
    {
      preHandler: [fastify.requireRole([Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER])],
      schema: {
        tags: ['Knowledge Base & RAG'],
        summary: 'Upload & Ingest Document File (TXT, MD, PDF, DOCX) (Phase 5B)',
        params: z.object({ id: z.string().uuid() }),
      },
    },
    async (request, reply) => {
      const { organizationId } = request.user;
      const { id: knowledgeBaseId } = request.params;

      const fileData = await request.file();
      if (!fileData) {
        return reply.status(400).send({
          success: false,
          error: { code: 'BAD_REQUEST', message: 'No file uploaded in multipart request' },
        });
      }

      const fileBuffer = await fileData.toBuffer();

      try {
        const doc = await DocumentIngestionService.ingestDocument({
          organizationId,
          knowledgeBaseId,
          filename: fileData.filename,
          mimeType: fileData.mimetype,
          fileBuffer,
        });

        return reply.status(201).send({
          success: true,
          data: doc,
        });
      } catch (err: any) {
        const msg = err.message || 'File upload ingestion failed';
        const code = msg.startsWith('FILE_TOO_LARGE')
          ? 'FILE_TOO_LARGE'
          : msg.startsWith('UNSUPPORTED_MIME_TYPE')
          ? 'UNSUPPORTED_MIME_TYPE'
          : 'INGESTION_FAILED';

        return reply.status(code === 'FILE_TOO_LARGE' || code === 'UNSUPPORTED_MIME_TYPE' ? 400 : 422).send({
          success: false,
          error: { code, message: msg },
        });
      }
    }
  );

  // 5. List Documents for a Knowledge Base
  typedFastify.get(
    '/api/knowledge/:id/documents',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Knowledge Base & RAG'],
        summary: 'List Documents in Knowledge Base',
        params: z.object({ id: z.string().uuid() }),
      },
    },
    async (request, reply) => {
      const { organizationId } = request.user;
      const { id: knowledgeBaseId } = request.params;

      const kb = await KnowledgeBase.findOne({ where: { id: knowledgeBaseId, organizationId } });
      if (!kb) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Knowledge Base not found' },
        });
      }

      const docs = await Document.findAll({
        where: { knowledgeBaseId, organizationId },
        order: [['createdAt', 'DESC']],
      });

      return reply.send({
        success: true,
        data: docs,
      });
    }
  );

  // 6. Get Document with Chunks
  typedFastify.get(
    '/api/documents/:documentId',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Knowledge Base & RAG'],
        summary: 'Get Document Details & Chunks',
        params: z.object({ documentId: z.string().uuid() }),
      },
    },
    async (request, reply) => {
      const { organizationId } = request.user;
      const { documentId } = request.params;

      const doc = await Document.findOne({
        where: { id: documentId, organizationId },
        include: [{ model: DocumentChunk, as: 'chunks' }],
      });

      if (!doc) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Document not found' },
        });
      }

      return reply.send({
        success: true,
        data: doc,
      });
    }
  );

  // 7. Delete Document
  typedFastify.delete(
    '/api/documents/:documentId',
    {
      preHandler: [fastify.requireRole([Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER])],
      schema: {
        tags: ['Knowledge Base & RAG'],
        summary: 'Delete Document & Associated Chunks (Admin/Manager)',
        params: z.object({ documentId: z.string().uuid() }),
      },
    },
    async (request, reply) => {
      const { organizationId } = request.user;
      const { documentId } = request.params;

      const doc = await Document.findOne({ where: { id: documentId, organizationId } });
      if (!doc) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Document not found' },
        });
      }

      await DocumentChunk.destroy({ where: { documentId: doc.id } });
      await doc.destroy();

      return reply.send({
        success: true,
        data: { message: 'Document deleted successfully' },
      });
    }
  );
}
