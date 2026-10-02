/**
 * Phase 5C — Base Embedding Provider (Abstract)
 * 
 * Common retry, timeout, and dimension validation logic shared by all providers.
 * Concrete providers (Ollama, OpenAI) only implement the raw API call methods.
 */

import {
  IEmbeddingProvider,
  EmbeddingResult,
  BatchEmbeddingResult,
  EmbeddingHealthStatus,
  EmbeddingProviderConfig,
  EmbeddingProviderError,
  EmbeddingDimensionMismatchError,
  EmbeddingProviderType,
} from './types';

export abstract class BaseEmbeddingProvider implements IEmbeddingProvider {
  readonly providerType: EmbeddingProviderType;
  readonly modelName: string;
  readonly dimension: number;
  readonly maxBatchSize: number;
  protected readonly timeoutMs: number;
  protected readonly maxRetries: number;
  protected readonly retryBaseDelayMs: number;

  constructor(config: EmbeddingProviderConfig) {
    this.providerType = config.provider;
    this.modelName = config.model;
    this.dimension = config.dimension;
    this.maxBatchSize = config.maxBatchSize;
    this.timeoutMs = config.timeoutMs;
    this.maxRetries = config.maxRetries;
    this.retryBaseDelayMs = config.retryBaseDelayMs;
  }

  // ---------------------------------------------------------------------------
  // Public API (template methods with retry + validation)
  // ---------------------------------------------------------------------------

  async embed(text: string): Promise<EmbeddingResult> {
    this.validateInput(text);

    const result = await this.withRetry(() => this.callEmbed(text));
    this.validateDimension(result.embedding);

    return result;
  }

  async embedBatch(texts: string[]): Promise<BatchEmbeddingResult> {
    if (!texts || texts.length === 0) {
      return {
        embeddings: [],
        totalTokensUsed: 0,
        provider: this.providerType,
        model: this.modelName,
        latencyMs: 0,
      };
    }

    // Validate all inputs
    texts.forEach((t, i) => this.validateInput(t, i));

    // Split into sub-batches if exceeding provider max
    const batches = this.splitIntoBatches(texts);
    const allEmbeddings: EmbeddingResult[] = [];
    let totalTokens = 0;
    const startTime = Date.now();

    for (const batch of batches) {
      const batchResult = await this.withRetry(() => this.callEmbedBatch(batch));

      // Validate every embedding dimension
      for (const result of batchResult.embeddings) {
        this.validateDimension(result.embedding);
      }

      allEmbeddings.push(...batchResult.embeddings);
      totalTokens += batchResult.totalTokensUsed;
    }

    return {
      embeddings: allEmbeddings,
      totalTokensUsed: totalTokens,
      provider: this.providerType,
      model: this.modelName,
      latencyMs: Date.now() - startTime,
    };
  }

  abstract healthCheck(): Promise<EmbeddingHealthStatus>;

  // ---------------------------------------------------------------------------
  // Abstract methods for concrete providers to implement
  // ---------------------------------------------------------------------------

  /**
   * Raw single-text embedding call — no retry, no validation.
   * Implementations should make the API call and return the raw result.
   */
  protected abstract callEmbed(text: string): Promise<EmbeddingResult>;

  /**
   * Raw batch embedding call — no retry, no validation.
   * The batch is guaranteed to be within maxBatchSize.
   */
  protected abstract callEmbedBatch(texts: string[]): Promise<BatchEmbeddingResult>;

  // ---------------------------------------------------------------------------
  // Shared helpers
  // ---------------------------------------------------------------------------

  private validateInput(text: string, index?: number): void {
    if (typeof text !== 'string') {
      const position = index !== undefined ? ` at index ${index}` : '';
      throw new EmbeddingProviderError(
        `Invalid input${position}: expected string, got ${typeof text}`,
        this.providerType,
        this.modelName,
        false,
      );
    }

    if (text.trim().length === 0) {
      const position = index !== undefined ? ` at index ${index}` : '';
      throw new EmbeddingProviderError(
        `Empty input text${position}: embedding requires non-empty content`,
        this.providerType,
        this.modelName,
        false,
      );
    }
  }

  protected validateDimension(embedding: number[]): void {
    if (!Array.isArray(embedding)) {
      throw new EmbeddingDimensionMismatchError(
        this.dimension,
        0,
        this.providerType,
        this.modelName,
      );
    }

    if (embedding.length !== this.dimension) {
      throw new EmbeddingDimensionMismatchError(
        this.dimension,
        embedding.length,
        this.providerType,
        this.modelName,
      );
    }
  }

  private splitIntoBatches(texts: string[]): string[][] {
    const batches: string[][] = [];
    for (let i = 0; i < texts.length; i += this.maxBatchSize) {
      batches.push(texts.slice(i, i + this.maxBatchSize));
    }
    return batches;
  }

  /**
   * Retry with exponential backoff + jitter.
   * Only retries on EmbeddingProviderError with isRetryable=true.
   */
  protected async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (err: any) {
        lastError = err;

        const isRetryable =
          err instanceof EmbeddingProviderError ? err.isRetryable : false;

        if (!isRetryable || attempt >= this.maxRetries) {
          throw err;
        }

        // Exponential backoff with jitter: baseDelay * 2^attempt + random(0..100)ms
        const delay =
          this.retryBaseDelayMs * Math.pow(2, attempt) +
          Math.floor(Math.random() * 100);

        await this.sleep(delay);
      }
    }

    // Should be unreachable, but TypeScript needs it
    throw lastError || new Error('Retry exhausted');
  }

  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
