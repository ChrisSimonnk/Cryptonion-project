/**
 * Phase 5C — OpenAI Embedding Provider
 * 
 * Interacts with OpenAI Embeddings API (v1/embeddings).
 * Supports:
 * - text-embedding-3-small (default, 1536 dims)
 * - text-embedding-3-large (3072 dims or truncated)
 * - text-embedding-ada-002 (legacy, 1536 dims)
 * - Custom dimensions parameter for v3 models
 * - Rate limit (429) & server error (5xx) classification for backoff retry
 */

import { BaseEmbeddingProvider } from './base.provider';
import {
  EmbeddingResult,
  BatchEmbeddingResult,
  EmbeddingHealthStatus,
  EmbeddingProviderConfig,
  EmbeddingProviderError,
} from './types';

export interface OpenAIProviderOptions extends Partial<EmbeddingProviderConfig> {
  apiKey?: string;
  baseUrl?: string;
  organization?: string;
}

export class OpenAIEmbeddingProvider extends BaseEmbeddingProvider {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly organization?: string;

  constructor(options: OpenAIProviderOptions = {}) {
    const apiKey = options.apiKey || process.env.OPENAI_API_KEY || '';
    const baseUrl = (options.baseUrl || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
    const model = options.model || process.env.OPENAI_EMBED_MODEL || 'text-embedding-3-small';
    const dimension = options.dimension || parseInt(process.env.VECTOR_DIMENSION || '1536', 10);
    const maxBatchSize = options.maxBatchSize || 64; // Safe batch limit
    const timeoutMs = options.timeoutMs || 30000;
    const maxRetries = options.maxRetries ?? 3;
    const retryBaseDelayMs = options.retryBaseDelayMs ?? 1000; // OpenAI recommends slightly longer backoff

    super({
      provider: 'openai',
      model,
      dimension,
      maxBatchSize,
      timeoutMs,
      maxRetries,
      retryBaseDelayMs,
    });

    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.organization = options.organization || process.env.OPENAI_ORGANIZATION;
  }

  // ---------------------------------------------------------------------------
  // Provider Implementation
  // ---------------------------------------------------------------------------

  protected async callEmbed(text: string): Promise<EmbeddingResult> {
    const batchRes = await this.callEmbedBatch([text]);
    if (!batchRes.embeddings[0]) {
      throw new EmbeddingProviderError(
        'OpenAI returned empty response for single embedding',
        this.providerType,
        this.modelName,
        false
      );
    }
    return batchRes.embeddings[0];
  }

  protected async callEmbedBatch(texts: string[]): Promise<BatchEmbeddingResult> {
    if (!this.apiKey) {
      throw new EmbeddingProviderError(
        'OpenAI API key is missing. Set OPENAI_API_KEY environment variable.',
        this.providerType,
        this.modelName,
        false,
        401
      );
    }

    const startTime = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      };
      if (this.organization) {
        headers['OpenAI-Organization'] = this.organization;
      }

      const body: Record<string, any> = {
        model: this.modelName,
        input: texts,
      };

      // Only pass dimensions parameter for models that support it (v3 models)
      if (this.modelName.includes('text-embedding-3')) {
        body.dimensions = this.dimension;
      }

      const response = await fetch(`${this.baseUrl}/embeddings`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        const errorMessage = (errorBody as any)?.error?.message || `HTTP ${response.status}`;
        const isRetryable = response.status === 429 || response.status >= 500;

        throw new EmbeddingProviderError(
          `OpenAI API error (${response.status}): ${errorMessage}`,
          this.providerType,
          this.modelName,
          isRetryable,
          response.status
        );
      }

      const data = (await response.json()) as {
        data: Array<{ embedding: number[]; index: number }>;
        usage?: { prompt_tokens: number; total_tokens: number };
      };

      if (!data.data || !Array.isArray(data.data)) {
        throw new EmbeddingProviderError(
          'Malformed OpenAI response: missing data array',
          this.providerType,
          this.modelName,
          false,
          response.status
        );
      }

      // Sort by index to ensure original order preservation
      const sortedData = [...data.data].sort((a, b) => a.index - b.index);

      const totalTokens = data.usage?.total_tokens || texts.reduce((acc, t) => acc + Math.ceil(t.length / 4), 0);
      const perItemTokens = Math.max(1, Math.round(totalTokens / texts.length));

      const embeddings: EmbeddingResult[] = sortedData.map((item) => ({
        embedding: item.embedding,
        tokensUsed: perItemTokens,
      }));

      return {
        embeddings,
        totalTokensUsed: totalTokens,
        provider: this.providerType,
        model: this.modelName,
        latencyMs: Date.now() - startTime,
      };
    } catch (err: any) {
      if (err instanceof EmbeddingProviderError) {
        throw err;
      }

      const isAbort = err.name === 'AbortError' || controller.signal.aborted;
      const isNetwork = err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.message?.includes('fetch failed');

      throw new EmbeddingProviderError(
        isAbort
          ? `OpenAI request timed out after ${this.timeoutMs}ms`
          : `OpenAI network error: ${err.message}`,
        this.providerType,
        this.modelName,
        isAbort || isNetwork,
        undefined,
        err
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  async healthCheck(): Promise<EmbeddingHealthStatus> {
    if (!this.apiKey) {
      return {
        status: 'unavailable',
        provider: this.providerType,
        model: this.modelName,
        dimension: this.dimension,
        message: 'OpenAI API key is unconfigured',
      };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const res = await fetch(`${this.baseUrl}/models/${this.modelName}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        signal: controller.signal,
      });

      if (!res.ok) {
        return {
          status: 'unavailable',
          provider: this.providerType,
          model: this.modelName,
          dimension: this.dimension,
          message: `OpenAI model check failed with status ${res.status}`,
        };
      }

      return {
        status: 'ok',
        provider: this.providerType,
        model: this.modelName,
        dimension: this.dimension,
        message: 'OpenAI embedding model reachable and authenticated',
      };
    } catch (err: any) {
      return {
        status: 'unavailable',
        provider: this.providerType,
        model: this.modelName,
        dimension: this.dimension,
        message: `OpenAI health check error: ${err.message}`,
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}
