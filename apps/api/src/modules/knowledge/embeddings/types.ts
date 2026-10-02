/**
 * Phase 5C — Embedding Provider Abstraction Types
 * 
 * Defines the canonical contract for all embedding providers.
 * Every provider must implement IEmbeddingProvider.
 * 
 * Design decisions:
 * - Providers return raw float arrays, not pgvector-formatted strings
 * - Dimension is declared per-provider and validated at the service layer
 * - Batch size limits are provider-specific (Ollama vs OpenAI have different limits)
 */

// ---------------------------------------------------------------------------
// Embedding Result
// ---------------------------------------------------------------------------

export interface EmbeddingResult {
  /** The raw embedding vector as a number array */
  embedding: number[];
  /** Number of tokens consumed for this input text */
  tokensUsed: number;
}

export interface BatchEmbeddingResult {
  /** Ordered array of embedding results matching input order */
  embeddings: EmbeddingResult[];
  /** Total tokens consumed across the entire batch */
  totalTokensUsed: number;
  /** Provider identifier */
  provider: string;
  /** Model identifier used for this batch */
  model: string;
  /** Latency in milliseconds for the entire batch */
  latencyMs: number;
}

// ---------------------------------------------------------------------------
// Provider Configuration
// ---------------------------------------------------------------------------

export interface EmbeddingProviderConfig {
  /** Provider identifier: 'ollama' | 'openai' */
  provider: EmbeddingProviderType;
  /** Model to use for embeddings */
  model: string;
  /** Expected vector dimension for the chosen model */
  dimension: number;
  /** Maximum number of texts per batch request */
  maxBatchSize: number;
  /** Request timeout in milliseconds */
  timeoutMs: number;
  /** Maximum number of retry attempts on transient failures */
  maxRetries: number;
  /** Base delay for exponential backoff in milliseconds */
  retryBaseDelayMs: number;
}

export type EmbeddingProviderType = 'ollama' | 'openai';

// ---------------------------------------------------------------------------
// Provider Interface
// ---------------------------------------------------------------------------

export interface IEmbeddingProvider {
  /** Provider type identifier */
  readonly providerType: EmbeddingProviderType;

  /** Model name used by this provider instance */
  readonly modelName: string;

  /** Expected embedding vector dimension */
  readonly dimension: number;

  /** Maximum texts per single API call */
  readonly maxBatchSize: number;

  /**
   * Generate an embedding for a single text input.
   * @param text - The input text to embed
   * @returns Promise resolving to embedding result
   * @throws EmbeddingProviderError on failure after retries
   */
  embed(text: string): Promise<EmbeddingResult>;

  /**
   * Generate embeddings for a batch of text inputs.
   * Implementations should handle batch-size limits internally.
   * @param texts - Array of input texts to embed
   * @returns Promise resolving to batch embedding result
   * @throws EmbeddingProviderError on failure after retries
   */
  embedBatch(texts: string[]): Promise<BatchEmbeddingResult>;

  /**
   * Check provider connectivity and readiness.
   * @returns Promise resolving to health status
   */
  healthCheck(): Promise<EmbeddingHealthStatus>;
}

// ---------------------------------------------------------------------------
// Health Check
// ---------------------------------------------------------------------------

export interface EmbeddingHealthStatus {
  status: 'ok' | 'degraded' | 'unavailable';
  provider: EmbeddingProviderType;
  model: string;
  dimension: number;
  message?: string;
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class EmbeddingProviderError extends Error {
  constructor(
    message: string,
    public readonly provider: EmbeddingProviderType,
    public readonly model: string,
    public readonly isRetryable: boolean = false,
    public readonly statusCode?: number,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = 'EmbeddingProviderError';
    // Preserve stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, EmbeddingProviderError);
    }
  }
}

export class EmbeddingDimensionMismatchError extends EmbeddingProviderError {
  constructor(
    public readonly expected: number,
    public readonly received: number,
    provider: EmbeddingProviderType,
    model: string,
  ) {
    super(
      `Dimension mismatch: expected ${expected}, received ${received} from ${provider}/${model}`,
      provider,
      model,
      false,
    );
    this.name = 'EmbeddingDimensionMismatchError';
  }
}

export class EmbeddingBatchSizeExceededError extends EmbeddingProviderError {
  constructor(
    public readonly requested: number,
    public readonly maxAllowed: number,
    provider: EmbeddingProviderType,
    model: string,
  ) {
    super(
      `Batch size ${requested} exceeds maximum ${maxAllowed} for ${provider}/${model}`,
      provider,
      model,
      false,
    );
    this.name = 'EmbeddingBatchSizeExceededError';
  }
}
