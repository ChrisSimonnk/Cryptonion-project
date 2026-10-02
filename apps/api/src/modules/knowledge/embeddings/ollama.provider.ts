/**
 * Phase 5C — Ollama Embedding Provider
 * 
 * Interacts with Ollama local embedding API.
 * Supports:
 * - /api/embed endpoint (Ollama v0.1.34+, supporting batch embeddings)
 * - /api/embeddings fallback endpoint (legacy single-prompt)
 * - AbortController timeout management
 * - Transient failure classification for retry loop
 */

import { BaseEmbeddingProvider } from './base.provider';
import {
  EmbeddingResult,
  BatchEmbeddingResult,
  EmbeddingHealthStatus,
  EmbeddingProviderConfig,
  EmbeddingProviderError,
} from './types';

export interface OllamaProviderOptions extends Partial<EmbeddingProviderConfig> {
  baseUrl?: string;
  model?: string;
  dimension?: number;
}

export class OllamaEmbeddingProvider extends BaseEmbeddingProvider {
  private readonly baseUrl: string;

  constructor(options: OllamaProviderOptions = {}) {
    const baseUrl = (options.baseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434').replace(/\/+$/, '');
    const model = options.model || process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text';
    const dimension = options.dimension || parseInt(process.env.VECTOR_DIMENSION || '768', 10);
    const maxBatchSize = options.maxBatchSize || 32;
    const timeoutMs = options.timeoutMs || 30000;
    const maxRetries = options.maxRetries ?? 3;
    const retryBaseDelayMs = options.retryBaseDelayMs ?? 500;

    super({
      provider: 'ollama',
      model,
      dimension,
      maxBatchSize,
      timeoutMs,
      maxRetries,
      retryBaseDelayMs,
    });

    this.baseUrl = baseUrl;
  }

  // ---------------------------------------------------------------------------
  // Provider Implementation
  // ---------------------------------------------------------------------------

  protected async callEmbed(text: string): Promise<EmbeddingResult> {
    const batchRes = await this.callEmbedBatch([text]);
    if (!batchRes.embeddings[0]) {
      throw new EmbeddingProviderError(
        'Ollama returned empty response for single embedding',
        this.providerType,
        this.modelName,
        false
      );
    }
    return batchRes.embeddings[0];
  }

  protected async callEmbedBatch(texts: string[]): Promise<BatchEmbeddingResult> {
    const startTime = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      // 1. Try modern /api/embed endpoint first (supports batch input: string[])
      const embedUrl = `${this.baseUrl}/api/embed`;
      const response = await fetch(embedUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.modelName,
          input: texts,
        }),
        signal: controller.signal,
      });

      if (response.ok) {
        const data = (await response.json()) as {
          model: string;
          embeddings: number[][];
          prompt_eval_count?: number;
        };

        if (!data.embeddings || !Array.isArray(data.embeddings)) {
          throw new EmbeddingProviderError(
            'Malformed Ollama response: missing embeddings array',
            this.providerType,
            this.modelName,
            false,
            response.status
          );
        }

        const totalTokens = data.prompt_eval_count || texts.reduce((acc, t) => acc + Math.ceil(t.length / 4), 0);
        const perItemTokens = Math.max(1, Math.round(totalTokens / texts.length));

        const embeddings: EmbeddingResult[] = data.embeddings.map((vec) => ({
          embedding: vec,
          tokensUsed: perItemTokens,
        }));

        return {
          embeddings,
          totalTokensUsed: totalTokens,
          provider: this.providerType,
          model: this.modelName,
          latencyMs: Date.now() - startTime,
        };
      }

      // If /api/embed gives 404, fallback to legacy /api/embeddings (single item sequential)
      if (response.status === 404) {
        return await this.callLegacyEmbeddings(texts, controller.signal, startTime);
      }

      // Non-200 responses
      const errorText = await response.text().catch(() => '');
      const isRetryable = response.status >= 500 || response.status === 429;
      throw new EmbeddingProviderError(
        `Ollama API error (${response.status}): ${errorText.slice(0, 200)}`,
        this.providerType,
        this.modelName,
        isRetryable,
        response.status
      );
    } catch (err: any) {
      if (err instanceof EmbeddingProviderError) {
        throw err;
      }

      const isAbort = err.name === 'AbortError' || controller.signal.aborted;
      const isNetwork = err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.message?.includes('fetch failed');

      throw new EmbeddingProviderError(
        isAbort
          ? `Ollama request timed out after ${this.timeoutMs}ms`
          : `Ollama network error: ${err.message}`,
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

  /**
   * Fallback for older Ollama versions that only have /api/embeddings (one prompt per request)
   */
  private async callLegacyEmbeddings(
    texts: string[],
    signal: AbortSignal,
    startTime: number
  ): Promise<BatchEmbeddingResult> {
    const embeddings: EmbeddingResult[] = [];
    let totalTokens = 0;

    for (const text of texts) {
      const response = await fetch(`${this.baseUrl}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.modelName,
          prompt: text,
        }),
        signal,
      });

      if (!response.ok) {
        const errBody = await response.text().catch(() => '');
        throw new EmbeddingProviderError(
          `Ollama legacy embedding failed (${response.status}): ${errBody.slice(0, 200)}`,
          this.providerType,
          this.modelName,
          response.status >= 500,
          response.status
        );
      }

      const data = (await response.json()) as { embedding: number[] };
      const tokensUsed = Math.ceil(text.length / 4);
      embeddings.push({
        embedding: data.embedding,
        tokensUsed,
      });
      totalTokens += tokensUsed;
    }

    return {
      embeddings,
      totalTokensUsed: totalTokens,
      provider: this.providerType,
      model: this.modelName,
      latencyMs: Date.now() - startTime,
    };
  }

  async healthCheck(): Promise<EmbeddingHealthStatus> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const res = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        signal: controller.signal,
      });

      if (!res.ok) {
        return {
          status: 'unavailable',
          provider: this.providerType,
          model: this.modelName,
          dimension: this.dimension,
          message: `Ollama returned HTTP ${res.status}`,
        };
      }

      const data = (await res.json()) as { models?: Array<{ name: string }> };
      const modelInstalled = data.models?.some((m) =>
        m.name === this.modelName || m.name.startsWith(`${this.modelName}:`)
      );

      return {
        status: modelInstalled ? 'ok' : 'degraded',
        provider: this.providerType,
        model: this.modelName,
        dimension: this.dimension,
        message: modelInstalled
          ? 'Ollama connected and embedding model ready'
          : `Ollama connected but model '${this.modelName}' not found in installed models list`,
      };
    } catch (err: any) {
      return {
        status: 'unavailable',
        provider: this.providerType,
        model: this.modelName,
        dimension: this.dimension,
        message: `Ollama unreachable at ${this.baseUrl}: ${err.message}`,
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}
