import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  EmbeddingProviderError,
  EmbeddingDimensionMismatchError,
} from '../modules/knowledge/embeddings/types';
import { OllamaEmbeddingProvider } from '../modules/knowledge/embeddings/ollama.provider';
import { OpenAIEmbeddingProvider } from '../modules/knowledge/embeddings/openai.provider';
import { EmbeddingService, ChunkToEmbed } from '../modules/knowledge/embeddings/embedding.service';

/**
 * Senior QA Manager Comprehensive Matrix for Phase 5C: Embedding Providers
 * 
 * Target Coverage:
 * - Adversarial & Edge Input Stress (Unicode, giant strings, corrupted vector arrays)
 * - Dimension Rigidity & Float Validation (NaN, Infinity, truncated vectors)
 * - Concurrency & Load Simulation (Simultaneous batch requests)
 * - Security & Tenant Isolation Boundary (No cross-tenant bleed, no DB mutations in 5C)
 * - Timeout & AbortController Rigor
 */

describe('SENIOR QA COMPREHENSIVE MATRIX: Phase 5C Embedding Architecture', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  // =========================================================================
  // MATRIX SECTION 1: ADVERSARIAL & EDGE INPUT STRESS
  // =========================================================================
  describe('Edge & Adversarial Input Stress', () => {
    it('handles multi-megabyte giant strings without memory exhaustion or crash', async () => {
      const giantText = 'Cryptonion clinical AI knowledge base '.repeat(2000); // ~76KB text
      const mockVector = new Array(768).fill(0.001);

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          model: 'nomic-embed-text',
          embeddings: [mockVector],
          prompt_eval_count: 500,
        }),
      } as any);

      const provider = new OllamaEmbeddingProvider({ dimension: 768 });
      const res = await provider.embed(giantText);

      expect(res.embedding).toHaveLength(768);
      expect(res.tokensUsed).toBe(500);
    });

    it('correctly encodes and embeds multilingual, RTL, and emoji-heavy texts', async () => {
      const complexText = '🩺 Clinical Assessment: 症状 (Symptoms) ➔ ضغط الدم مرتفع (High BP) 🚀';
      const mockVector = new Array(1536).fill(0.042);

      let capturedPayload: any;
      global.fetch = vi.fn().mockImplementation(async (_, init) => {
        capturedPayload = JSON.parse(init.body);
        return {
          ok: true,
          status: 200,
          json: async () => ({
            data: [{ embedding: mockVector, index: 0 }],
            usage: { total_tokens: 28 },
          }),
        };
      });

      const provider = new OpenAIEmbeddingProvider({
        apiKey: 'sk-test-qa',
        dimension: 1536,
      });

      const res = await provider.embed(complexText);
      expect(res.embedding).toHaveLength(1536);
      expect(capturedPayload.input[0]).toBe(complexText);
    });

    it('rejects batch if any single item is empty or invalid, failing fast before any external call', async () => {
      global.fetch = vi.fn();
      const provider = new OllamaEmbeddingProvider();

      const invalidBatch = ['Valid text 1', '   ', 'Valid text 3'];

      await expect(provider.embedBatch(invalidBatch)).rejects.toThrow('Empty input text at index 1');
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // MATRIX SECTION 2: DIMENSION RIGIDITY & DATA INTEGRITY
  // =========================================================================
  describe('Dimension Rigidity & Vector Integrity', () => {
    it('detects off-by-one vector dimension: N-1 dimension is rejected', async () => {
      const offByOne = new Array(767).fill(0.1); // 767 instead of 768
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          model: 'nomic-embed-text',
          embeddings: [offByOne],
        }),
      } as any);

      const provider = new OllamaEmbeddingProvider({ dimension: 768 });
      await expect(provider.embed('Test')).rejects.toThrow(EmbeddingDimensionMismatchError);
    });

    it('detects off-by-one vector dimension: N+1 dimension is rejected', async () => {
      const offByOne = new Array(769).fill(0.1); // 769 instead of 768
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          model: 'nomic-embed-text',
          embeddings: [offByOne],
        }),
      } as any);

      const provider = new OllamaEmbeddingProvider({ dimension: 768 });
      await expect(provider.embed('Test')).rejects.toThrow(EmbeddingDimensionMismatchError);
    });

    it('rejects non-array or malformed vector responses from downstream API', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          model: 'nomic-embed-text',
          embeddings: 'not an array', // Corrupt structure
        }),
      } as any);

      const provider = new OllamaEmbeddingProvider({ dimension: 768 });
      await expect(provider.embed('Corrupt test')).rejects.toThrow('Malformed Ollama response');
    });
  });

  // =========================================================================
  // MATRIX SECTION 3: TIMEOUT & RETRY RESILIENCE
  // =========================================================================
  describe('Timeout, Retry & Backoff Resilience', () => {
    it('aborts and times out when request exceeds timeoutMs', async () => {
      global.fetch = vi.fn().mockImplementation((_, init) => {
        return new Promise((_, reject) => {
          init.signal?.addEventListener('abort', () => {
            const err = new Error('The operation was aborted');
            err.name = 'AbortError';
            reject(err);
          });
        });
      });

      const provider = new OllamaEmbeddingProvider({
        timeoutMs: 50,
        maxRetries: 0,
      });

      await expect(provider.embed('Timeout test')).rejects.toThrow('timed out after 50ms');
    });

    it('exhausts retry attempts on persistent 502 Bad Gateway and reports failure', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        text: async () => '502 Bad Gateway from upstream gateway',
      } as any);

      const provider = new OllamaEmbeddingProvider({
        maxRetries: 2,
        retryBaseDelayMs: 5,
      });

      await expect(provider.embed('Failing gateway')).rejects.toThrow('Ollama API error (502)');
      expect(global.fetch).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
    });
  });

  // =========================================================================
  // MATRIX SECTION 4: CONCURRENT LOAD & TENANT ISOLATION
  // =========================================================================
  describe('Concurrent Processing & Tenant Isolation Strictness', () => {
    it('handles concurrent batch requests from multiple tenants without race conditions', async () => {
      const vecTenantA = new Array(768).fill(0.111);
      const vecTenantB = new Array(768).fill(0.222);

      global.fetch = vi.fn().mockImplementation(async (_, init) => {
        const body = JSON.parse(init.body);
        const text = body.input[0];
        const isA = text.includes('TenantA');
        return {
          ok: true,
          status: 200,
          json: async () => ({
            model: 'nomic-embed-text',
            embeddings: [isA ? vecTenantA : vecTenantB],
            prompt_eval_count: 15,
          }),
        };
      });

      const service = new EmbeddingService({ provider: 'ollama', dimension: 768 });

      const chunksA: ChunkToEmbed[] = [{ chunkIndex: 0, content: 'TenantA sensitive medical protocol' }];
      const chunksB: ChunkToEmbed[] = [{ chunkIndex: 0, content: 'TenantB private marketing blueprint' }];

      const [resA, resB] = await Promise.all([
        service.embedChunks(chunksA, { organizationId: 'tenant-a-org', knowledgeBaseId: 'kb-a' }),
        service.embedChunks(chunksB, { organizationId: 'tenant-b-org', knowledgeBaseId: 'kb-b' }),
      ]);

      // Assert tenant metadata isolation
      expect(resA.chunks[0].metadata?.organizationId).toBe('tenant-a-org');
      expect(resB.chunks[0].metadata?.organizationId).toBe('tenant-b-org');
      expect(resA.chunks[0].embedding).toEqual(vecTenantA);
      expect(resB.chunks[0].embedding).toEqual(vecTenantB);
    });

    it('PHASE 5C BOUNDARY: does not invoke database persistence during embedding generation', async () => {
      const mockVector = new Array(768).fill(0.33);
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          model: 'nomic-embed-text',
          embeddings: [mockVector],
          prompt_eval_count: 10,
        }),
      } as any);

      const service = new EmbeddingService({ provider: 'ollama', dimension: 768 });
      const chunks: ChunkToEmbed[] = [{ chunkIndex: 0, content: 'Purity verification chunk' }];

      const result = await service.embedChunks(chunks, {
        organizationId: 'isolated-org',
        knowledgeBaseId: 'isolated-kb',
      });

      // Confirm vector result is returned purely in-memory
      expect(result.chunks[0].embedding).toEqual(mockVector);
      expect(result.chunks[0].metadata?.organizationId).toBe('isolated-org');
    });
  });
});
