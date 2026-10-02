import { sequelize, DocumentChunk, KnowledgeBase, Document } from '@cryptonion/db';
import { EmbeddingService } from './embeddings/embedding.service';

export interface RetrieveParams {
  organizationId: string;
  query: string;
  knowledgeBaseId?: string;
  topK?: number;
  minSimilarity?: number;
  embeddingService?: EmbeddingService;
}

export interface RetrievedChunk {
  id: string;
  knowledgeBaseId: string;
  documentId: string | null;
  filename: string;
  content: string;
  chunkIndex: number | null;
  pageNumber: number | null;
  similarity: number;
  metadata: Record<string, any>;
}

export class KnowledgeRetrievalService {
  private static defaultEmbeddingService: EmbeddingService | null = null;

  private static getEmbeddingService(): EmbeddingService {
    if (!this.defaultEmbeddingService) {
      this.defaultEmbeddingService = new EmbeddingService();
    }
    return this.defaultEmbeddingService;
  }

  /**
   * Calculates cosine similarity between two numeric vectors in memory
   */
  public static cosineSimilarity(a: number[], b: number[]): number {
    if (!a || !b || a.length !== b.length || a.length === 0) return 0;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Performs tenant-isolated semantic similarity search across knowledge base chunks.
   * Enforces that all retrieved chunks belong strictly to the requesting organizationId.
   */
  static async retrieveRelevantChunks(params: RetrieveParams): Promise<RetrievedChunk[]> {
    const {
      organizationId,
      query,
      knowledgeBaseId,
      topK = 5,
      minSimilarity = 0.0,
      embeddingService = this.getEmbeddingService(),
    } = params;

    if (!organizationId) {
      throw new Error('TENANT_ISOLATION_ERROR: organizationId is required for knowledge retrieval');
    }

    if (!query || query.trim().length === 0) {
      return [];
    }

    // 1. Generate Query Vector Embedding
    const queryEmbedResult = await embeddingService.embedQuery(query);
    const queryVector = queryEmbedResult.embedding;

    if (!queryVector || queryVector.length === 0) {
      return [];
    }

    const vectorStr = `[${queryVector.join(',')}]`;

    // 2. Attempt pgvector native similarity search via PostgreSQL
    try {
      const sql = `
        SELECT 
          dc.id,
          dc."knowledgeBaseId",
          dc."documentId",
          dc.content,
          dc."chunkIndex",
          dc."pageNumber",
          dc.metadata,
          COALESCE(d.filename, dc.metadata->>'filename', 'unknown') AS filename,
          (1 - (dc.embedding <=> :vectorStr::vector)) AS similarity
        FROM document_chunks dc
        JOIN knowledge_bases kb ON kb.id = dc."knowledgeBaseId"
        LEFT JOIN documents d ON d.id = dc."documentId"
        WHERE kb."organizationId" = :organizationId
          ${knowledgeBaseId ? 'AND dc."knowledgeBaseId" = :knowledgeBaseId' : ''}
          AND dc.embedding IS NOT NULL
        ORDER BY dc.embedding <=> :vectorStr::vector ASC
        LIMIT :topK;
      `;

      const rows: any[] = await sequelize.query(sql, {
        replacements: {
          organizationId,
          ...(knowledgeBaseId ? { knowledgeBaseId } : {}),
          vectorStr,
          topK,
        },
        type: 'SELECT' as any,
      });

      if (rows && rows.length > 0) {
        return rows
          .map((r) => ({
            id: r.id,
            knowledgeBaseId: r.knowledgeBaseId,
            documentId: r.documentId,
            filename: r.filename || 'unknown',
            content: r.content,
            chunkIndex: r.chunkIndex != null ? Number(r.chunkIndex) : null,
            pageNumber: r.pageNumber != null ? Number(r.pageNumber) : null,
            similarity: Number(r.similarity),
            metadata: r.metadata || {},
          }))
          .filter((chunk) => chunk.similarity >= minSimilarity);
      }
    } catch (sqlErr: any) {
      // In case pgvector extension is not active or running in mock/SQLite test mode,
      // fall back to ORM retrieval with in-memory cosine similarity calculation
    }

    // 3. Fallback: Query via ORM with strict organizationId filter and in-memory cosine ranking
    const kbFilter: any = { organizationId };
    if (knowledgeBaseId) {
      kbFilter.id = knowledgeBaseId;
    }

    const validKBs = await KnowledgeBase.findAll({
      where: kbFilter,
      attributes: ['id', 'organizationId'],
    });

    if (!validKBs || validKBs.length === 0) {
      return [];
    }

    const kbIds = validKBs.map((kb) => kb.id);

    const chunks = await DocumentChunk.findAll({
      where: {
        knowledgeBaseId: kbIds,
      },
    });

    const ranked: RetrievedChunk[] = [];

    for (const chunk of chunks) {
      if (!chunk.embedding) continue;

      let embArray: number[];
      if (typeof chunk.embedding === 'string') {
        try {
          embArray = JSON.parse(chunk.embedding.replace(/^{/, '[').replace(/}$/, ']'));
        } catch {
          continue;
        }
      } else if (Array.isArray(chunk.embedding)) {
        embArray = chunk.embedding;
      } else {
        continue;
      }

      const score = this.cosineSimilarity(queryVector, embArray);
      if (score >= minSimilarity) {
        ranked.push({
          id: chunk.id,
          knowledgeBaseId: chunk.knowledgeBaseId,
          documentId: chunk.documentId || null,
          filename: (chunk.metadata?.filename as string) || 'document',
          content: chunk.content,
          chunkIndex: chunk.chunkIndex ?? null,
          pageNumber: chunk.pageNumber ?? null,
          similarity: score,
          metadata: chunk.metadata || {},
        });
      }
    }

    // Sort descending by similarity
    ranked.sort((a, b) => b.similarity - a.similarity);

    return ranked.slice(0, topK);
  }
}
