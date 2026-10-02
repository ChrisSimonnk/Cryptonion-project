/**
 * Phase 5C — Embedding Service
 * 
 * High-level orchestration for embedding operations across the platform.
 * - Instantiates the appropriate provider (Ollama or OpenAI) based on config
 * - Enforces batch size limits and chunk validation
 * - Preserves tenant isolation context (organizationId) in all calls
 * - Strictly in-memory embedding generation (Phase 5C scope; vector persistence is 5D)
 */

import {
  IEmbeddingProvider,
  EmbeddingResult,
  BatchEmbeddingResult,
  EmbeddingHealthStatus,
  EmbeddingProviderType,
} from './types';
import { OllamaEmbeddingProvider } from './ollama.provider';
import { OpenAIEmbeddingProvider } from './openai.provider';

export interface EmbeddingServiceConfig {
  provider?: EmbeddingProviderType;
  model?: string;
  dimension?: number;
  ollamaBaseUrl?: string;
  openaiApiKey?: string;
  openaiBaseUrl?: string;
  timeoutMs?: number;
  maxRetries?: number;
}

export interface ChunkToEmbed {
  id?: string;
  chunkIndex: number;
  content: string;
  pageNumber?: number | null;
  metadata?: Record<string, any>;
}

export interface EmbeddedChunkResult {
  chunkIndex: number;
  content: string;
  embedding: number[];
  tokensUsed: number;
  metadata?: Record<string, any>;
}

export interface BatchChunkEmbedResult {
  chunks: EmbeddedChunkResult[];
  totalTokensUsed: number;
  provider: string;
  model: string;
  dimension: number;
  latencyMs: number;
}

export class EmbeddingService {
  private readonly provider: IEmbeddingProvider;

  constructor(config: EmbeddingServiceConfig = {}) {
    this.provider = EmbeddingService.createProvider(config);
  }

  /**
   * Factory method to create provider instance from configuration or environment
   */
  public static createProvider(config: EmbeddingServiceConfig = {}): IEmbeddingProvider {
    const providerType = (
      config.provider ||
      process.env.EMBEDDING_PROVIDER ||
      'openai'
    ).toLowerCase() as EmbeddingProviderType;

    if (providerType === 'openai') {
      return new OpenAIEmbeddingProvider({
        apiKey: config.openaiApiKey || process.env.OPENAI_API_KEY,
        baseUrl: config.openaiBaseUrl || process.env.OPENAI_BASE_URL,
        model: config.model || process.env.OPENAI_EMBED_MODEL || 'text-embedding-3-small',
        dimension: config.dimension || parseInt(process.env.VECTOR_DIMENSION || '1536', 10),
        timeoutMs: config.timeoutMs,
        maxRetries: config.maxRetries,
      });
    }

    if (providerType === 'ollama') {
      return new OllamaEmbeddingProvider({
        baseUrl: config.ollamaBaseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
        model: config.model || process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text',
        dimension: config.dimension || parseInt(process.env.VECTOR_DIMENSION || '768', 10),
        timeoutMs: config.timeoutMs,
        maxRetries: config.maxRetries,
      });
    }

    throw new Error(`Unsupported embedding provider: '${providerType}'. Supported: 'ollama', 'openai'`);
  }

  /**
   * Get active provider instance
   */
  public getProvider(): IEmbeddingProvider {
    return this.provider;
  }

  /**
   * Get active vector dimension
   */
  public getDimension(): number {
    return this.provider.dimension;
  }

  /**
   * Generate embedding for a single text input (e.g. a query)
   */
  public async embedQuery(text: string): Promise<EmbeddingResult> {
    if (!text || text.trim().length === 0) {
      throw new Error('EMBEDDING_EMPTY_QUERY: Query text cannot be empty');
    }
    return this.provider.embed(text);
  }

  /**
   * Generate embeddings for an array of document chunks in a tenant-safe manner.
   * NOTE: Strictly does NOT persist to database (Phase 5C boundary).
   */
  public async embedChunks(
    chunks: ChunkToEmbed[],
    context?: { organizationId?: string; knowledgeBaseId?: string }
  ): Promise<BatchChunkEmbedResult> {
    if (!chunks || chunks.length === 0) {
      return {
        chunks: [],
        totalTokensUsed: 0,
        provider: this.provider.providerType,
        model: this.provider.modelName,
        dimension: this.provider.dimension,
        latencyMs: 0,
      };
    }

    // Extract texts in exact index order
    const texts = chunks.map((c) => c.content);

    // Call underlying provider batch
    const batchResult = await this.provider.embedBatch(texts);

    // Pair vectors back with chunks
    const embeddedChunks: EmbeddedChunkResult[] = chunks.map((chunk, idx) => {
      const embRes = batchResult.embeddings[idx];
      return {
        chunkIndex: chunk.chunkIndex,
        content: chunk.content,
        embedding: embRes.embedding,
        tokensUsed: embRes.tokensUsed,
        metadata: {
          ...chunk.metadata,
          organizationId: context?.organizationId,
          knowledgeBaseId: context?.knowledgeBaseId,
          embeddedAt: new Date().toISOString(),
          provider: this.provider.providerType,
          model: this.provider.modelName,
        },
      };
    });

    return {
      chunks: embeddedChunks,
      totalTokensUsed: batchResult.totalTokensUsed,
      provider: batchResult.provider,
      model: batchResult.model,
      dimension: this.provider.dimension,
      latencyMs: batchResult.latencyMs,
    };
  }

  /**
   * Run health and readiness check on the active provider
   */
  public async healthCheck(): Promise<EmbeddingHealthStatus> {
    return this.provider.healthCheck();
  }
}
