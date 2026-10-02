import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  IEmbeddingProvider,
  EmbeddingResult,
  BatchEmbeddingResult,
  EmbeddingProviderError,
  EmbeddingDimensionMismatchError,
} from '../modules/knowledge/embeddings/types';
import { BaseEmbeddingProvider } from '../modules/knowledge/embeddings/base.provider';
import { OllamaEmbeddingProvider } from '../modules/knowledge/embeddings/ollama.provider';
import { OpenAIEmbeddingProvider } from '../modules/knowledge/embeddings/openai.provider';
import { EmbeddingService, ChunkToEmbed } from '../modules/knowledge/embeddings/embedding.service';

// Mock concrete implementation of BaseEmbeddingProvider for testing base functionality
class TestEmbeddingProvider extends BaseEmbeddingProvider {
  public mockCallEmbed = vi.fn();
  public mockCallEmbedBatch = vi.fn();
  public mockHealthCheck = vi.fn();

  constructor(configOverrides = {}) {
    super({
      provider: 'ollama',
      model: 'test-model',
      dimension: 768,
      maxBatchSize: 4,
      timeoutMs: 5000,
      maxRetries: 2,
      retryBaseDelayMs: 10,
      ...configOverrides,
    });
  }

  protected async callEmbed(text: string): Promise<EmbeddingResult> {
    return this.mockCallEmbed(text);
  }

  protected async callEmbedBatch(texts: string[]): Promise<BatchEmbeddingResult> {
    return this.mockCallEmbedBatch(texts);
  }

  async healthCheck() {
    return this.mockHealthCheck();
  }
}

describe('PHASE 5C: Embedding Provider Suite', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  // =========================================================================
  // 1. BASE PROVIDER & ABSTRACTION CONTRACT TESTS
  // =========================================================================
  describe('BaseEmbeddingProvider Contract & Guardrails', () => {
    it('validates dimension match on single embed', async () => {
      const provider = new TestEmbeddingProvider({ dimension: 768 });
      const validVector = new Array(768).fill(0.123);
      provider.mockCallEmbed.mockResolvedValueOnce({
        embedding: validVector,
        tokensUsed: 10,
      });

      const res = await provider.embed('Valid query text');
      expect(res.embedding).toHaveLength(768);
      expect(res.tokensUsed).toBe(10);
    });

    it('throws EmbeddingDimensionMismatchError when provider returns incorrect dimension', async () => {
      const provider = new TestEmbeddingProvider({ dimension: 768 });
      const mismatchedVector = new Array(384).fill(0.1); // Only 384 instead of 768
      provider.mockCallEmbed.mockResolvedValueOnce({
        embedding: mismatchedVector,
        tokensUsed: 10,
      });

      await expect(provider.embed('Test text')).rejects.toThrow(EmbeddingDimensionMismatchError);
    });

    it('rejects empty or whitespace-only inputs', async () => {
      const provider = new TestEmbeddingProvider();

      await expect(provider.embed('')).rejects.toThrow('Empty input text');
      await expect(provider.embed('   \n\t  ')).rejects.toThrow('Empty input text');
      // @ts-ignore
      await expect(provider.embed(null)).rejects.toThrow('Invalid input');
    });

    it('splits large batches into sub-batches according to maxBatchSize', async () => {
      const provider = new TestEmbeddingProvider({ maxBatchSize: 2, dimension: 4 });
      const dummyVec = [0.1, 0.2, 0.3, 0.4];

      provider.mockCallEmbedBatch
        .mockResolvedValueOnce({
          embeddings: [
            { embedding: dummyVec, tokensUsed: 5 },
            { embedding: dummyVec, tokensUsed: 5 },
          ],
          totalTokensUsed: 10,
          provider: 'ollama',
          model: 'test-model',
          latencyMs: 15,
        })
        .mockResolvedValueOnce({
          embeddings: [{ embedding: dummyVec, tokensUsed: 5 }],
          totalTokensUsed: 5,
          provider: 'ollama',
          model: 'test-model',
          latencyMs: 10,
        });

      const texts = ['Item 1', 'Item 2', 'Item 3'];
      const batchResult = await provider.embedBatch(texts);

      expect(provider.mockCallEmbedBatch).toHaveBeenCalledTimes(2);
      expect(batchResult.embeddings).toHaveLength(3);
      expect(batchResult.totalTokensUsed).toBe(15);
    });

    it('retries on retryable errors and succeeds within maxRetries limit', async () => {
      const provider = new TestEmbeddingProvider({ maxRetries: 2, retryBaseDelayMs: 5, dimension: 4 });
      const dummyVec = [1, 2, 3, 4];

      provider.mockCallEmbed
        .mockRejectedValueOnce(new EmbeddingProviderError('Temporary 503', 'ollama', 'test', true, 503))
        .mockResolvedValueOnce({ embedding: dummyVec, tokensUsed: 5 });

      const res = await provider.embed('Retry success');
      expect(res.embedding).toEqual(dummyVec);
      expect(provider.mockCallEmbed).toHaveBeenCalledTimes(2);
    });

    it('fails immediately without retry for non-retryable errors (e.g. 400 Bad Request)', async () => {
      const provider = new TestEmbeddingProvider({ maxRetries: 3 });

      provider.mockCallEmbed.mockRejectedValueOnce(
        new EmbeddingProviderError('Bad input', 'ollama', 'test', false, 400)
      );

      await expect(provider.embed('Failing text')).rejects.toThrow('Bad input');
      expect(provider.mockCallEmbed).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // 2. OLLAMA EMBEDDING PROVIDER TESTS
  // =========================================================================
  describe('OllamaEmbeddingProvider', () => {
    it('successfully calls modern /api/embed batch endpoint', async () => {
      const mockEmbeddings = [
        new Array(768).fill(0.5),
        new Array(768).fill(0.6),
      ];

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          model: 'nomic-embed-text',
          embeddings: mockEmbeddings,
          prompt_eval_count: 32,
        }),
      } as any);

      const provider = new OllamaEmbeddingProvider({
        baseUrl: 'http://localhost:11434',
        model: 'nomic-embed-text',
        dimension: 768,
      });

      const res = await provider.embedBatch(['Hello world', 'Second doc']);
      expect(res.embeddings).toHaveLength(2);
      expect(res.embeddings[0].embedding).toHaveLength(768);
      expect(res.embeddings[1].embedding).toHaveLength(768);
      expect(res.totalTokensUsed).toBe(32);
      expect(res.provider).toBe('ollama');
    });

    it('falls back to legacy /api/embeddings endpoint when /api/embed returns 404', async () => {
      const mockVector = new Array(768).fill(0.2);

      // First call (/api/embed) -> 404 Not Found
      // Subsequent calls (/api/embeddings) -> 200 OK
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          text: async () => '404 page not found',
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ embedding: mockVector }),
        } as any);

      const provider = new OllamaEmbeddingProvider({ dimension: 768 });
      const res = await provider.embed('Legacy fallback test');

      expect(res.embedding).toHaveLength(768);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('handles Ollama server errors (500) and marks them retryable', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal Ollama Error',
      } as any);

      const provider = new OllamaEmbeddingProvider({ maxRetries: 1, retryBaseDelayMs: 5 });

      await expect(provider.embed('Failing call')).rejects.toThrow('Ollama API error (500)');
      // 1 initial + 1 retry = 2 calls
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('performs health check and detects if model is installed', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          models: [{ name: 'nomic-embed-text:latest' }, { name: 'llama3:8b' }],
        }),
      } as any);

      const provider = new OllamaEmbeddingProvider({ model: 'nomic-embed-text' });
      const health = await provider.healthCheck();

      expect(health.status).toBe('ok');
      expect(health.model).toBe('nomic-embed-text');
    });

    it('reports health check unavailable when Ollama is unreachable', async () => {
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('connect ECONNREFUSED 127.0.0.1:11434'));

      const provider = new OllamaEmbeddingProvider();
      const health = await provider.healthCheck();

      expect(health.status).toBe('unavailable');
      expect(health.message).toContain('ECONNREFUSED');
    });
  });

  // =========================================================================
  // 3. OPENAI EMBEDDING PROVIDER TESTS
  // =========================================================================
  describe('OpenAIEmbeddingProvider', () => {
    it('requires API key and rejects immediately if missing', async () => {
      const provider = new OpenAIEmbeddingProvider({ apiKey: '' });
      await expect(provider.embed('Test')).rejects.toThrow('OpenAI API key is missing');
    });

    it('correctly formats request with Bearer authorization and dimension parameter', async () => {
      const mockVector = new Array(1536).fill(0.05);

      let capturedHeaders: any;
      let capturedBody: any;

      global.fetch = vi.fn().mockImplementation(async (url, init) => {
        capturedHeaders = init.headers;
        capturedBody = JSON.parse(init.body);
        return {
          ok: true,
          status: 200,
          json: async () => ({
            data: [{ embedding: mockVector, index: 0 }],
            usage: { total_tokens: 12 },
          }),
        };
      });

      const provider = new OpenAIEmbeddingProvider({
        apiKey: 'sk-test-secret-key-12345',
        model: 'text-embedding-3-small',
        dimension: 1536,
      });

      const res = await provider.embed('OpenAI test content');

      expect(res.embedding).toHaveLength(1536);
      expect(capturedHeaders['Authorization']).toBe('Bearer sk-test-secret-key-12345');
      expect(capturedBody.model).toBe('text-embedding-3-small');
      expect(capturedBody.dimensions).toBe(1536);
      expect(capturedBody.input).toEqual(['OpenAI test content']);
    });

    it('retries on rate limit 429 and succeeds', async () => {
      const mockVector = new Array(1536).fill(0.01);

      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          json: async () => ({ error: { message: 'Rate limit exceeded' } }),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            data: [{ embedding: mockVector, index: 0 }],
            usage: { total_tokens: 8 },
          }),
        } as any);

      const provider = new OpenAIEmbeddingProvider({
        apiKey: 'sk-test-key',
        maxRetries: 2,
        retryBaseDelayMs: 5,
      });

      const res = await provider.embed('Rate limited text');
      expect(res.embedding).toHaveLength(1536);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('preserves exact chunk ordering even if provider returns unsorted results', async () => {
      const vecA = new Array(1536).fill(0.1);
      const vecB = new Array(1536).fill(0.2);

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: [
            { embedding: vecB, index: 1 }, // Index 1 first
            { embedding: vecA, index: 0 }, // Index 0 second
          ],
          usage: { total_tokens: 20 },
        }),
      } as any);

      const provider = new OpenAIEmbeddingProvider({
        apiKey: 'sk-test',
        dimension: 1536,
      });

      const res = await provider.embedBatch(['First', 'Second']);
      expect(res.embeddings[0].embedding).toEqual(vecA);
      expect(res.embeddings[1].embedding).toEqual(vecB);
    });
  });

  // =========================================================================
  // 4. EMBEDDING SERVICE ORCHESTRATION & TENANT SAFETY
  // =========================================================================
  describe('EmbeddingService Orchestration', () => {
    it('instantiates the configured provider via factory pattern', () => {
      const ollamaService = new EmbeddingService({ provider: 'ollama' });
      expect(ollamaService.getProvider().providerType).toBe('ollama');

      const openaiService = new EmbeddingService({
        provider: 'openai',
        openaiApiKey: 'sk-dummy-key',
      });
      expect(openaiService.getProvider().providerType).toBe('openai');
    });

    it('rejects unsupported provider configuration with descriptive error', () => {
      // @ts-ignore
      expect(() => new EmbeddingService({ provider: 'cohere' })).toThrow(
        "Unsupported embedding provider: 'cohere'"
      );
    });

    it('embeds queries with validation', async () => {
      const mockVector = new Array(768).fill(0.77);
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          model: 'nomic-embed-text',
          embeddings: [mockVector],
        }),
      } as any);

      const service = new EmbeddingService({ provider: 'ollama', dimension: 768 });
      const queryRes = await service.embedQuery('What is Cryptonion?');

      expect(queryRes.embedding).toHaveLength(768);
      await expect(service.embedQuery('')).rejects.toThrow('EMBEDDING_EMPTY_QUERY');
    });

    it('embeds chunks, attaches tenant isolation metadata, and preserves chunk order', async () => {
      const vec0 = new Array(768).fill(0.01);
      const vec1 = new Array(768).fill(0.02);
      const vec2 = new Array(768).fill(0.03);

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          model: 'nomic-embed-text',
          embeddings: [vec0, vec1, vec2],
          prompt_eval_count: 60,
        }),
      } as any);

      const service = new EmbeddingService({ provider: 'ollama', dimension: 768 });

      const chunks: ChunkToEmbed[] = [
        { chunkIndex: 0, content: 'Paragraph one of company policy' },
        { chunkIndex: 1, content: 'Paragraph two of company policy' },
        { chunkIndex: 2, content: 'Paragraph three of company policy' },
      ];

      const tenantContext = {
        organizationId: 'org-tenant-uuid-1234',
        knowledgeBaseId: 'kb-uuid-5678',
      };

      const result = await service.embedChunks(chunks, tenantContext);

      expect(result.chunks).toHaveLength(3);
      expect(result.chunks[0].chunkIndex).toBe(0);
      expect(result.chunks[1].chunkIndex).toBe(1);
      expect(result.chunks[2].chunkIndex).toBe(2);

      // Check tenant context preservation in metadata
      expect(result.chunks[0].metadata?.organizationId).toBe('org-tenant-uuid-1234');
      expect(result.chunks[0].metadata?.knowledgeBaseId).toBe('kb-uuid-5678');
      expect(result.chunks[0].metadata?.provider).toBe('ollama');

      // Verify strict Phase 5C boundary: result is purely returned in-memory
      expect(result.chunks[0].embedding).toEqual(vec0);
      expect(result.totalTokensUsed).toBe(60);
    });

    it('handles empty chunk lists safely without API invocation', async () => {
      global.fetch = vi.fn();

      const service = new EmbeddingService({ provider: 'ollama' });
      const result = await service.embedChunks([]);

      expect(result.chunks).toHaveLength(0);
      expect(result.totalTokensUsed).toBe(0);
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });
});
