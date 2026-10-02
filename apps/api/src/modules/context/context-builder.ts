import { AIEmployee, Message, Conversation, KnowledgeBase } from '@cryptonion/db';
import { MessageSender } from '@cryptonion/shared';
import { MemoryService } from '../memory/memory.service';
import { KnowledgeRetrievalService, RetrievedChunk } from '../knowledge/retrieval.service';
import { EmbeddingService } from '../knowledge/embeddings/embedding.service';

export interface BuiltContext {
  systemPrompt: string;
  chatHistory: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  currentUserMessage: string;
  memoriesInjected: number;
  knowledgeChunksInjected: number;
  retrievedKnowledge?: RetrievedChunk[];
}

export class ContextBuilder {
  private static readonly DEFAULT_MAX_HISTORY_TURNS = 10;
  private static readonly DEFAULT_MAX_CONTEXT_CHARS = 16000;
  private static readonly DEFAULT_MAX_MEMORIES = 20;

  /**
   * Assembles a bounded, deterministic, multi-turn AI context
   */
  static async buildContext(params: {
    organizationId: string;
    aiEmployeeId: string;
    conversationId?: string;
    leadId?: string | null;
    currentUserMessage: string;
    maxHistoryTurns?: number;
    maxContextChars?: number;
    maxMemories?: number;
    knowledgeBaseId?: string;
    includeKnowledge?: boolean;
    knowledgeTopK?: number;
    knowledgeMinSimilarity?: number;
    embeddingService?: EmbeddingService;
  }): Promise<BuiltContext> {
    const {
      organizationId,
      aiEmployeeId,
      conversationId,
      leadId,
      currentUserMessage,
      maxHistoryTurns = this.DEFAULT_MAX_HISTORY_TURNS,
      maxContextChars = this.DEFAULT_MAX_CONTEXT_CHARS,
      maxMemories = this.DEFAULT_MAX_MEMORIES,
      knowledgeBaseId,
      includeKnowledge = true,
      knowledgeTopK = 3,
      knowledgeMinSimilarity = 0.0,
      embeddingService,
    } = params;

    // 1. Fetch AI Employee instructions
    const employee = await AIEmployee.findOne({
      where: { id: aiEmployeeId, organizationId },
    });

    const baseSystemPrompt = employee?.llmConfig?.systemPrompt || 'You are an autonomous AI employee.';

    // 2. Fetch structured long-term memories
    const memories = await MemoryService.getContextMemories(
      organizationId,
      aiEmployeeId,
      leadId,
      maxMemories
    );

    // Format structured memories section
    let memoryPromptSection = '';
    if (memories.length > 0) {
      const memoryLines = memories.map(
        (m) => `- [${m.type}] ${m.key}: ${m.value}`
      );
      memoryPromptSection = `\n\nKnown facts and context about this contact:\n${memoryLines.join('\n')}`;
    }

    // 3. Fetch Knowledge Base RAG excerpts if requested
    let retrievedChunks: RetrievedChunk[] = [];
    let knowledgePromptSection = '';

    if (includeKnowledge && currentUserMessage) {
      try {
        let kbId = knowledgeBaseId;
        if (!kbId) {
          const linkedKb = await KnowledgeBase.findOne({
            where: { organizationId, aiEmployeeId },
            attributes: ['id'],
          });
          if (linkedKb) {
            kbId = linkedKb.id;
          }
        }

        retrievedChunks = await KnowledgeRetrievalService.retrieveRelevantChunks({
          organizationId,
          query: currentUserMessage,
          knowledgeBaseId: kbId,
          topK: knowledgeTopK,
          minSimilarity: knowledgeMinSimilarity,
          embeddingService,
        });

        if (retrievedChunks.length > 0) {
          const chunkTexts = retrievedChunks.map(
            (c, i) =>
              `[Source ${i + 1}: ${c.filename}${c.pageNumber ? `, Page ${c.pageNumber}` : ''}, Score: ${c.similarity.toFixed(2)}]\n${c.content}`
          );
          knowledgePromptSection = `\n\nRelevant Knowledge Base Information:\n${chunkTexts.join('\n\n')}`;
        }
      } catch (err: any) {
        // Non-blocking error handling for knowledge retrieval failure
      }
    }

    const fullSystemPrompt = `${baseSystemPrompt}${memoryPromptSection}${knowledgePromptSection}`;

    // 4. Fetch bounded short-term conversation history
    const chatHistory: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];

    if (conversationId) {
      const recentMessages = await Message.findAll({
        where: { conversationId },
        order: [['createdAt', 'DESC']],
        limit: maxHistoryTurns,
      });

      // Reverse to chronological order (oldest first)
      const chronological = recentMessages.reverse();

      for (const msg of chronological) {
        let role: 'system' | 'user' | 'assistant' = 'user';
        if (msg.sender === MessageSender.AI_EMPLOYEE) {
          role = 'assistant';
        } else if (msg.sender === MessageSender.SYSTEM) {
          role = 'system';
        } else {
          role = 'user';
        }

        chatHistory.push({ role, content: msg.content });
      }
    }

    // 5. Context Size Bounding: Ensure prompt fits within maxContextChars
    // Rule: Never truncate system prompt or current user message. Prune history from oldest first if necessary.
    let totalLength = fullSystemPrompt.length + currentUserMessage.length + chatHistory.reduce((acc, m) => acc + m.content.length, 0);

    while (totalLength > maxContextChars && chatHistory.length > 0) {
      const removed = chatHistory.shift();
      if (removed) {
        totalLength -= removed.content.length;
      }
    }

    return {
      systemPrompt: fullSystemPrompt,
      chatHistory,
      currentUserMessage,
      memoriesInjected: memories.length,
      knowledgeChunksInjected: retrievedChunks.length,
      retrievedKnowledge: retrievedChunks,
    };
  }
}
