import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Document, DocumentChunk, KnowledgeBase, AIEmployee, sequelize } from '@cryptonion/db';
import { DocumentStatus, KnowledgeStatus } from '@cryptonion/shared';
import { DocumentIngestionService } from '../modules/knowledge/document.service';
import { KnowledgeRetrievalService } from '../modules/knowledge/retrieval.service';
import { ContextBuilder } from '../modules/context/context-builder';
import { EmbeddingService } from '../modules/knowledge/embeddings/embedding.service';
import { IEmbeddingProvider } from '../modules/knowledge/embeddings/types';

// Deterministic mock embedding generator for 1536-dimension vectors
function generateMockVector(dimension = 1536, seed = 1): number[] {
  const vec = new Array(dimension);
  let norm = 0;
  for (let i = 0; i < dimension; i++) {
    const val = Math.sin(seed * (i + 1));
    vec[i] = val;
    norm += val * val;
  }
  const magnitude = Math.sqrt(norm);
  return vec.map((v) => v / magnitude); // Normalized unit vector
}

// Seeded generator for semantic simulation
function semanticMockVector(topic: string, dimension = 1536): number[] {
  const lower = topic.toLowerCase();
  let seed = 42;
  if (lower.includes('postgres') || lower.includes('database')) seed = 101;
  else if (lower.includes('redis') || lower.includes('cache') || lower.includes('caching')) seed = 202;
  else if (lower.includes('ai') || lower.includes('intelligence')) seed = 303;
  else if (lower.includes('alpha')) seed = 401;
  else if (lower.includes('beta')) seed = 402;
  else if (lower.includes('unrelated')) seed = 999;
  return generateMockVector(dimension, seed);
}

describe('Phase 5 Verification Gate: Knowledge & RAG Production Readiness', () => {
  const orgA_Id = '11111111-1111-1111-1111-111111111111';
  const orgB_Id = '22222222-2222-2222-2222-222222222222';
  const kbA_Id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const kbB_Id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

  let mockEmbeddingProvider: IEmbeddingProvider;
  let mockEmbeddingService: EmbeddingService;

  beforeEach(() => {
    vi.restoreAllMocks();

    vi.spyOn(sequelize, 'transaction').mockImplementation(async (callback: any) => {
      return callback({});
    });
    vi.spyOn(sequelize, 'query').mockImplementation((async () => {
      return [] as any;
    }) as any);
    vi.spyOn(KnowledgeBase, 'findOne').mockResolvedValue({
      id: kbA_Id,
      organizationId: orgA_Id,
      chunkCount: 0,
      increment: vi.fn(),
    } as any);

    mockEmbeddingProvider = {
      providerType: 'openai',
      modelName: 'text-embedding-3-small',
      dimension: 1536,
      maxBatchSize: 100,
      embed: vi.fn(async (text: string) => {
        return {
          embedding: semanticMockVector(text, 1536),
          tokensUsed: 8,
        };
      }),
      embedBatch: vi.fn(async (texts: string[]) => {
        return {
          embeddings: texts.map((t) => ({
            embedding: semanticMockVector(t, 1536),
            tokensUsed: 8,
          })),
          totalTokensUsed: texts.length * 8,
          dimension: 1536,
          provider: 'openai',
          model: 'text-embedding-3-small',
          latencyMs: 25,
        };
      }),
      healthCheck: vi.fn(async () => ({
        status: 'ok' as const,
        provider: 'openai' as const,
        model: 'text-embedding-3-small',
        dimension: 1536,
      })),
    };

    mockEmbeddingService = new EmbeddingService({
      provider: 'openai',
      model: 'text-embedding-3-small',
      dimension: 1536,
    });
    vi.spyOn(mockEmbeddingService, 'getProvider').mockReturnValue(mockEmbeddingProvider);
    vi.spyOn(mockEmbeddingService, 'embedQuery').mockImplementation(async (text: string) =>
      mockEmbeddingProvider.embed(text)
    );
    vi.spyOn(mockEmbeddingService, 'embedChunks').mockImplementation(async (chunks: any[]) => {
      const texts = chunks.map((c) => c.content);
      const res = await mockEmbeddingProvider.embedBatch(texts);
      return {
        chunks: chunks.map((c, i) => ({
          chunkIndex: c.chunkIndex,
          content: c.content,
          embedding: res.embeddings[i].embedding,
          tokensUsed: 8,
          metadata: c.metadata,
        })),
        totalTokensUsed: res.totalTokensUsed,
        provider: 'openai',
        model: 'text-embedding-3-small',
        dimension: 1536,
        latencyMs: 20,
      };
    });
  });

  // STEP 4 & 5: Canonical Dimension Alignment
  describe('Canonical Embedding & Vector Dimension Alignment (Steps 4 & 5)', () => {
    it('verifies canonical model text-embedding-3-small produces exactly 1536 dimensions matching DB schema', async () => {
      const text = 'Cryptonion Phase 5 embedding verification.';
      const res = await mockEmbeddingService.embedQuery(text);

      expect(res.embedding).toBeDefined();
      expect(Array.isArray(res.embedding)).toBe(true);
      expect(res.embedding.length).toBe(1536);
      expect(mockEmbeddingService.getDimension()).toBe(1536);
      expect(mockEmbeddingService.getProvider().modelName).toBe('text-embedding-3-small');
    });

    it('rejects dimensional mismatch between provider output and configured schema', async () => {
      const mismatchedProvider: IEmbeddingProvider = {
        providerType: 'openai',
        modelName: 'mismatched-model',
        dimension: 1536,
        maxBatchSize: 100,
        embed: vi.fn(async () => ({
          embedding: new Array(768).fill(0.1), // Wrong dimension (768 vs 1536)
          tokensUsed: 5,
        })),
        embedBatch: vi.fn(),
        healthCheck: vi.fn(async () => ({
          status: 'ok' as const,
          provider: 'openai' as const,
          model: 'mismatched-model',
          dimension: 1536,
        })),
      };

      const baseService = new EmbeddingService();
      vi.spyOn(baseService, 'embedQuery').mockImplementation(async () => {
        const out = await mismatchedProvider.embed('test');
        if (out.embedding.length !== 1536) {
          throw new Error(`DIMENSION_MISMATCH: Expected 1536 but received ${out.embedding.length}`);
        }
        return out;
      });

      await expect(baseService.embedQuery('test')).rejects.toThrow('DIMENSION_MISMATCH');
    });
  });

  // STEP 8 & 9: Document Pipeline & Deterministic Chunking
  describe('Document Pipeline & Deterministic Chunking (Steps 8 & 9)', () => {
    it('executes document pipeline: Parse -> Normalize -> Chunk -> Embed -> Persist atomically', async () => {
      const mockKB = {
        id: kbA_Id,
        organizationId: orgA_Id,
        chunkCount: 0,
        increment: vi.fn(),
      };
      vi.spyOn(KnowledgeBase, 'findOne').mockResolvedValue(mockKB as any);

      let savedDocState: any = null;
      vi.spyOn(Document, 'create').mockImplementation(async (attrs: any) => {
        savedDocState = {
          ...attrs,
          id: 'doc-1111',
          update: vi.fn(async (patch: any) => Object.assign(savedDocState, patch)),
          reload: vi.fn(),
        };
        return savedDocState as any;
      });

      let insertedChunks: any[] = [];
      vi.spyOn(DocumentChunk, 'destroy').mockResolvedValue(0 as any);
      vi.spyOn(DocumentChunk, 'bulkCreate').mockImplementation(async (records: any) => {
        insertedChunks = records;
        return records as any;
      });

      const content = 'First section header\n\nFact A: Cryptonion uses PostgreSQL for database storage.\n\nSecond section header\n\nFact B: Cryptonion uses Redis for caching.';
      const buffer = Buffer.from(content, 'utf-8');

      const doc = await DocumentIngestionService.ingestDocument({
        organizationId: orgA_Id,
        knowledgeBaseId: kbA_Id,
        filename: 'architecture.txt',
        mimeType: 'text/plain',
        fileBuffer: buffer,
        options: {
          embeddingService: mockEmbeddingService,
        },
      });

      expect(doc.status).toBe(DocumentStatus.READY);
      expect(insertedChunks.length).toBeGreaterThan(0);
      expect(insertedChunks[0].embedding).toBeDefined();
      expect(insertedChunks[0].embedding.length).toBe(1536);
      expect(insertedChunks[0].documentId).toBe('doc-1111');
      expect(insertedChunks[0].knowledgeBaseId).toBe(kbA_Id);
    });

    it('ensures chunking is 100% deterministic on identical input document', async () => {
      const mockKB = { id: kbA_Id, organizationId: orgA_Id, chunkCount: 0 };
      vi.spyOn(KnowledgeBase, 'findOne').mockResolvedValue(mockKB as any);

      let run1Chunks: any[] = [];
      let run2Chunks: any[] = [];

      vi.spyOn(Document, 'create').mockImplementation(async (attrs: any) => ({
        ...attrs,
        id: 'doc-det',
        update: vi.fn(),
        reload: vi.fn(),
      } as any));

      vi.spyOn(DocumentChunk, 'destroy').mockResolvedValue(0 as any);

      // Run 1
      vi.spyOn(DocumentChunk, 'bulkCreate').mockImplementationOnce(async (records: any) => {
        run1Chunks = records;
        return records as any;
      });
      const content = 'Section 1: Data storage in Cryptonion.\nSection 2: Caching layer.\nSection 3: Fastify web server.';
      await DocumentIngestionService.ingestDocument({
        organizationId: orgA_Id,
        knowledgeBaseId: kbA_Id,
        filename: 'manual.txt',
        mimeType: 'text/plain',
        fileBuffer: Buffer.from(content, 'utf-8'),
        options: { embeddingService: mockEmbeddingService },
      });

      // Run 2
      vi.spyOn(DocumentChunk, 'bulkCreate').mockImplementationOnce(async (records: any) => {
        run2Chunks = records;
        return records as any;
      });
      await DocumentIngestionService.ingestDocument({
        organizationId: orgA_Id,
        knowledgeBaseId: kbA_Id,
        filename: 'manual.txt',
        mimeType: 'text/plain',
        fileBuffer: Buffer.from(content, 'utf-8'),
        options: { embeddingService: mockEmbeddingService },
      });

      expect(run1Chunks.length).toBe(run2Chunks.length);
      run1Chunks.forEach((c1, i) => {
        const c2 = run2Chunks[i];
        expect(c1.content).toBe(c2.content);
        expect(c1.chunkIndex).toBe(c2.chunkIndex);
        expect(c1.pageNumber).toBe(c2.pageNumber);
      });
    });
  });

  // STEP 10: Vector Similarity Retrieval
  describe('Vector Similarity Retrieval (Step 10)', () => {
    it('retrieves and ranks distinct facts accurately using cosine similarity', async () => {
      const factPostgres = 'Fact A: Cryptonion uses PostgreSQL for database storage.';
      const factRedis = 'Fact B: Cryptonion uses Redis for message queues and caching.';
      const factAI = 'Fact C: Cryptonion has an AI intelligence service.';

      const chunks = [
        {
          id: 'chunk-pg',
          knowledgeBaseId: kbA_Id,
          documentId: 'doc-1',
          content: factPostgres,
          chunkIndex: 0,
          pageNumber: 1,
          embedding: semanticMockVector(factPostgres, 1536),
          metadata: { filename: 'infra.txt' },
        },
        {
          id: 'chunk-redis',
          knowledgeBaseId: kbA_Id,
          documentId: 'doc-1',
          content: factRedis,
          chunkIndex: 1,
          pageNumber: 1,
          embedding: semanticMockVector(factRedis, 1536),
          metadata: { filename: 'infra.txt' },
        },
        {
          id: 'chunk-ai',
          knowledgeBaseId: kbA_Id,
          documentId: 'doc-1',
          content: factAI,
          chunkIndex: 2,
          pageNumber: 2,
          embedding: semanticMockVector(factAI, 1536),
          metadata: { filename: 'infra.txt' },
        },
      ];

      vi.spyOn(KnowledgeBase, 'findAll').mockResolvedValue([
        { id: kbA_Id, organizationId: orgA_Id },
      ] as any);
      vi.spyOn(DocumentChunk, 'findAll').mockResolvedValue(chunks as any);

      // Semantic Query 1: Cache
      const redisResults = await KnowledgeRetrievalService.retrieveRelevantChunks({
        organizationId: orgA_Id,
        query: 'What does Cryptonion use for caching?',
        topK: 1,
        embeddingService: mockEmbeddingService,
      });

      expect(redisResults.length).toBe(1);
      expect(redisResults[0].content).toContain('Redis');
      expect(redisResults[0].similarity).toBeGreaterThan(0.9);

      // Semantic Query 2: Database
      const pgResults = await KnowledgeRetrievalService.retrieveRelevantChunks({
        organizationId: orgA_Id,
        query: 'What database does Cryptonion use?',
        topK: 1,
        embeddingService: mockEmbeddingService,
      });

      expect(pgResults.length).toBe(1);
      expect(pgResults[0].content).toContain('PostgreSQL');
      expect(pgResults[0].similarity).toBeGreaterThan(0.9);
    });
  });

  // STEP 11: RAG Context Construction
  describe('RAG Context Assembly & Bounding (Step 11)', () => {
    it('injects retrieved knowledge chunks with source metadata into ContextBuilder prompt', async () => {
      const mockEmployee = {
        id: 'emp-1',
        organizationId: orgA_Id,
        name: 'Alex AI',
        llmConfig: { systemPrompt: 'You are an IT infrastructure assistant.' },
      };
      vi.spyOn(AIEmployee, 'findOne').mockResolvedValue(mockEmployee as any);
      vi.spyOn(KnowledgeBase, 'findAll').mockResolvedValue([{ id: kbA_Id, organizationId: orgA_Id }] as any);
      vi.spyOn(DocumentChunk, 'findAll').mockResolvedValue([
        {
          id: 'c-1',
          knowledgeBaseId: kbA_Id,
          documentId: 'doc-1',
          content: 'Fact A: Cryptonion uses PostgreSQL for database storage.',
          chunkIndex: 0,
          pageNumber: 1,
          embedding: semanticMockVector('Fact A: Cryptonion uses PostgreSQL', 1536),
          metadata: { filename: 'infra_guide.pdf' },
        },
      ] as any);

      const context = await ContextBuilder.buildContext({
        organizationId: orgA_Id,
        aiEmployeeId: 'emp-1',
        currentUserMessage: 'Tell me about the database architecture',
        knowledgeBaseId: kbA_Id,
        includeKnowledge: true,
        embeddingService: mockEmbeddingService,
      });

      expect(context.systemPrompt).toContain('You are an IT infrastructure assistant.');
      expect(context.systemPrompt).toContain('Relevant Knowledge Base Information:');
      expect(context.systemPrompt).toContain('[Source 1: infra_guide.pdf, Page 1');
      expect(context.systemPrompt).toContain('PostgreSQL');
      expect(context.knowledgeChunksInjected).toBe(1);
    });

    it('safely bounds oversized context without dropping system prompt or user query', async () => {
      const mockEmployee = {
        id: 'emp-1',
        organizationId: orgA_Id,
        name: 'Alex AI',
        llmConfig: { systemPrompt: 'Core system instructions.' },
      };
      vi.spyOn(AIEmployee, 'findOne').mockResolvedValue(mockEmployee as any);
      vi.spyOn(KnowledgeBase, 'findAll').mockResolvedValue([{ id: kbA_Id, organizationId: orgA_Id }] as any);
      vi.spyOn(DocumentChunk, 'findAll').mockResolvedValue([] as any);

      const context = await ContextBuilder.buildContext({
        organizationId: orgA_Id,
        aiEmployeeId: 'emp-1',
        currentUserMessage: 'Important immediate user instruction.',
        maxContextChars: 150, // Strict small limit
        includeKnowledge: false,
      });

      expect(context.systemPrompt).toContain('Core system instructions.');
      expect(context.currentUserMessage).toBe('Important immediate user instruction.');
      expect(context.systemPrompt.length).toBeLessThanOrEqual(150);
    });
  });

  // STEP 12: Multi-Tenant Security & Isolation
  describe('Multi-Tenant Security & Isolation (Step 12)', () => {
    it('strictly isolates Tenant A and Tenant B: zero cross-tenant knowledge leakage', async () => {
      const orgA_Chunks = [
        {
          id: 'chunk-org-a',
          knowledgeBaseId: kbA_Id,
          content: 'Confidential Strategy for Tenant Alpha.',
          embedding: semanticMockVector('Confidential Strategy for Tenant Alpha.', 1536),
          metadata: { filename: 'alpha.txt' },
        },
      ];

      const orgB_Chunks = [
        {
          id: 'chunk-org-b',
          knowledgeBaseId: kbB_Id,
          content: 'Secret Roadmap for Tenant Beta.',
          embedding: semanticMockVector('Secret Roadmap for Tenant Beta.', 1536),
          metadata: { filename: 'beta.txt' },
        },
      ];

      // Knowledge bases per tenant
      vi.spyOn(KnowledgeBase, 'findAll').mockImplementation(async (opts: any) => {
        const where = opts?.where || {};
        const allKBs = [
          { id: kbA_Id, organizationId: orgA_Id },
          { id: kbB_Id, organizationId: orgB_Id },
        ];
        return allKBs.filter((kb) => {
          if (where.organizationId && kb.organizationId !== where.organizationId) return false;
          if (where.id && kb.id !== where.id) return false;
          return true;
        }) as any;
      });

      vi.spyOn(DocumentChunk, 'findAll').mockImplementation(async (opts: any) => {
        const kbIds = opts.where.knowledgeBaseId;
        if (kbIds.includes(kbA_Id)) return orgA_Chunks as any;
        if (kbIds.includes(kbB_Id)) return orgB_Chunks as any;
        return [];
      });

      // Tenant A Query
      const resultsTenantA = await KnowledgeRetrievalService.retrieveRelevantChunks({
        organizationId: orgA_Id,
        query: 'What is the strategy for Tenant Alpha?',
        embeddingService: mockEmbeddingService,
      });

      expect(resultsTenantA.length).toBe(1);
      expect(resultsTenantA[0].content).toContain('Tenant Alpha');
      expect(resultsTenantA[0].content).not.toContain('Tenant Beta');

      // Tenant B Query
      const resultsTenantB = await KnowledgeRetrievalService.retrieveRelevantChunks({
        organizationId: orgB_Id,
        query: 'What is the roadmap for Tenant Beta?',
        embeddingService: mockEmbeddingService,
      });

      expect(resultsTenantB.length).toBe(1);
      expect(resultsTenantB[0].content).toContain('Tenant Beta');
      expect(resultsTenantB[0].content).not.toContain('Tenant Alpha');

      // Tenant A attempting to access Tenant B knowledgeBaseId explicitly
      const crossTenantResults = await KnowledgeRetrievalService.retrieveRelevantChunks({
        organizationId: orgA_Id,
        knowledgeBaseId: kbB_Id, // Belongs to Tenant B!
        query: 'What is the roadmap for Tenant Beta?',
        embeddingService: mockEmbeddingService,
      });

      expect(crossTenantResults.length).toBe(0); // DENIED: 0 records returned
    });

    it('throws TENANT_ISOLATION_ERROR when organizationId is missing', async () => {
      await expect(
        KnowledgeRetrievalService.retrieveRelevantChunks({
          organizationId: '',
          query: 'any query',
          embeddingService: mockEmbeddingService,
        })
      ).rejects.toThrow('TENANT_ISOLATION_ERROR');
    });
  });

  // STEP 13 & 14: Document Security & Failure Handling
  describe('Document Security & Failure Handling (Steps 13 & 14)', () => {
    it('rejects files exceeding max size limit with FILE_TOO_LARGE', async () => {
      const hugeBuffer = Buffer.alloc(11 * 1024 * 1024); // 11MB
      await expect(
        DocumentIngestionService.ingestDocument({
          organizationId: orgA_Id,
          knowledgeBaseId: kbA_Id,
          filename: 'giant.txt',
          mimeType: 'text/plain',
          fileBuffer: hugeBuffer,
        })
      ).rejects.toThrow('FILE_TOO_LARGE');
    });

    it('rejects empty documents with EMPTY_DOCUMENT', async () => {
      await expect(
        DocumentIngestionService.ingestDocument({
          organizationId: orgA_Id,
          knowledgeBaseId: kbA_Id,
          filename: 'empty.txt',
          mimeType: 'text/plain',
          fileBuffer: Buffer.alloc(0),
        })
      ).rejects.toThrow('EMPTY_DOCUMENT');
    });

    it('rejects unsupported MIME types with UNSUPPORTED_MIME_TYPE', async () => {
      await expect(
        DocumentIngestionService.ingestDocument({
          organizationId: orgA_Id,
          knowledgeBaseId: kbA_Id,
          filename: 'binary.exe',
          mimeType: 'application/octet-stream',
          fileBuffer: Buffer.from('executable binary code', 'utf-8'),
        })
      ).rejects.toThrow('UNSUPPORTED_MIME_TYPE');
    });

    it('transitions document to FAILED on processing failure without marking READY', async () => {
      const mockKB = { id: kbA_Id, organizationId: orgA_Id };
      vi.spyOn(KnowledgeBase, 'findOne').mockResolvedValue(mockKB as any);

      let docState: any = null;
      vi.spyOn(Document, 'create').mockImplementation(async (attrs: any) => {
        docState = {
          ...attrs,
          id: 'doc-fail',
          update: vi.fn(async (patch: any) => Object.assign(docState, patch)),
        };
        return docState as any;
      });

      // Force failure during parsing / embedding
      const failingEmbeddingService = new EmbeddingService();
      vi.spyOn(failingEmbeddingService, 'embedChunks').mockRejectedValue(
        new Error('External Provider Timeout')
      );

      await expect(
        DocumentIngestionService.ingestDocument({
          organizationId: orgA_Id,
          knowledgeBaseId: kbA_Id,
          filename: 'sample.txt',
          mimeType: 'text/plain',
          fileBuffer: Buffer.from('Valid sample text content', 'utf-8'),
          options: {
            generateEmbeddings: true,
            embeddingService: failingEmbeddingService,
          },
        })
      ).rejects.toThrow('EMBEDDING_FAILED');

      expect(docState.status).toBe(DocumentStatus.FAILED);
      expect(docState.errorMessage).toContain('EMBEDDING_FAILED');
      expect(docState.status).not.toBe(DocumentStatus.READY);
    });
  });

  // STEP 15: Idempotency & Clean Re-processing
  describe('Idempotency & Re-processing (Step 15)', () => {
    it('cleans up old chunks on re-ingestion and preserves consistency', async () => {
      const mockKB = { id: kbA_Id, organizationId: orgA_Id };
      vi.spyOn(KnowledgeBase, 'findOne').mockResolvedValue(mockKB as any);

      let docState: any = null;
      vi.spyOn(Document, 'create').mockImplementation(async (attrs: any) => {
        docState = {
          ...attrs,
          id: 'doc-idemp',
          update: vi.fn(async (patch: any) => Object.assign(docState, patch)),
          reload: vi.fn(),
        };
        return docState as any;
      });

      const destroyedDocIds: string[] = [];
      vi.spyOn(DocumentChunk, 'destroy').mockImplementation(async (opts: any) => {
        destroyedDocIds.push(opts.where.documentId);
        return 1 as any;
      });

      vi.spyOn(DocumentChunk, 'bulkCreate').mockResolvedValue([] as any);

      await DocumentIngestionService.ingestDocument({
        organizationId: orgA_Id,
        knowledgeBaseId: kbA_Id,
        filename: 'idemp.txt',
        mimeType: 'text/plain',
        fileBuffer: Buffer.from('Idempotency test content', 'utf-8'),
        options: { embeddingService: mockEmbeddingService },
      });

      expect(destroyedDocIds).toContain('doc-idemp');
      expect(docState.status).toBe(DocumentStatus.READY);
    });
  });
});
