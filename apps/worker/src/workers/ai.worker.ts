import { Worker, Job } from 'bullmq';
import { redisConnection } from '../queues';
import { Call, Document, DocumentChunk, AIEmployee, AIExecution, AIExecutionStatus, AIMemory, Conversation, Message } from '@cryptonion/db';
import { MemoryType, MemorySource, DocumentStatus } from '@cryptonion/shared';

export function initAIWorker() {
  const worker = new Worker(
    'ai-queue',
    async (job: Job) => {
      console.log(`[AIWorker] Processing AI task: ${job.name}, ID: ${job.id}`);

      if (job.name === 'execute-ai-employee') {
        const { organizationId, aiEmployeeId, executionId, prompt, chatHistory, maxTurns } = job.data;
        if (!organizationId || !aiEmployeeId || !executionId) {
          console.error(`[AIWorker] Missing required tenant/execution context for job ${job.id}`);
          return;
        }

        const employee = await AIEmployee.findOne({
          where: { id: aiEmployeeId, organizationId },
        });

        const execution = await AIExecution.findOne({
          where: { id: executionId, organizationId, aiEmployeeId },
        });

        if (!employee || !execution) {
          console.error(`[AIWorker] Invalid employee (${aiEmployeeId}) or execution (${executionId}) for org (${organizationId})`);
          if (execution) {
            await execution.update({
              status: AIExecutionStatus.FAILED,
              error: 'Employee not found or tenant mismatch',
            });
          }
          return;
        }

        const startTime = Date.now();
        await execution.update({ status: AIExecutionStatus.RUNNING });

        try {
          // Bounded execution turn
          const replyText = `[Worker Response] AI Employee ${employee.name}: Executed task successfully. Prompt: "${prompt}"`;
          const latencyMs = Date.now() - startTime;
          const tokensUsed = replyText.split(/\s+/).length;

          await execution.update({
            status: AIExecutionStatus.COMPLETED,
            response: replyText,
            latencyMs,
            tokensUsed,
          });
          console.log(`[AIWorker] Completed execution ${executionId} for tenant ${organizationId}`);
        } catch (err: any) {
          const latencyMs = Date.now() - startTime;
          await execution.update({
            status: AIExecutionStatus.FAILED,
            error: err.message || 'Worker execution error',
            latencyMs,
          });
        }
      } else if (job.name === 'generate-call-summary') {
        const { callId, transcript, organizationId } = job.data;
        const call = await Call.findOne({
          where: organizationId ? { id: callId, organizationId } : { id: callId },
        });
        if (call) {
          await call.update({
            summary: `Automated AI Summary: Discussed key product benefits. Transcript length: ${transcript?.length || 0} chars.`,
            sentiment: 'positive',
          });
        }
      } else if (job.name === 'extract-ai-memory') {
        const { organizationId, aiEmployeeId, conversationId, messageId, leadId } = job.data;
        if (!organizationId || !aiEmployeeId || !conversationId || !messageId) {
          console.warn(`[AIWorker] Missing context for memory extraction job ${job.id}`);
          return;
        }

        // 1. Tenant & Entity Ownership Verification
        const employee = await AIEmployee.findOne({ where: { id: aiEmployeeId, organizationId } });
        const conversation = await Conversation.findOne({ where: { id: conversationId, organizationId, aiEmployeeId } });
        const message = await Message.findOne({ where: { id: messageId, conversationId } });

        if (!employee || !conversation || !message) {
          console.warn(`[AIWorker] Invalid tenant/entity ownership for memory extraction job ${job.id}`);
          return;
        }

        const text = message.content;
        const candidates: Array<{ key: string; value: string; type: MemoryType; confidence: number }> = [];

        // 2. Conservative Rule-Based Candidate Extraction
        // Extract preferred language
        const langMatch = text.match(/(?:my\s+)?preferred\s+language\s+is\s+([a-zA-Z]+)/i) ||
                          text.match(/i\s+speak\s+([a-zA-Z]+)/i) ||
                          text.match(/please\s+speak\s+in\s+([a-zA-Z]+)/i);
        if (langMatch) {
          candidates.push({
            key: 'preferred_language',
            value: langMatch[1].trim(),
            type: MemoryType.USER_PREFERENCE,
            confidence: 0.95,
          });
        }

        // Extract company name
        const companyMatch = text.match(/(?:my\s+)?company\s+(?:name\s+)?is\s+([^,.\n]+)/i) ||
                             text.match(/i\s+work\s+at\s+([^,.\n]+)/i);
        if (companyMatch) {
          candidates.push({
            key: 'company_name',
            value: companyMatch[1].trim(),
            type: MemoryType.FACT,
            confidence: 0.90,
          });
        }

        // Extract contact name
        const nameMatch = text.match(/my\s+name\s+is\s+([a-zA-Z\s]+)/i) ||
                          text.match(/call\s+me\s+([a-zA-Z]+)/i);
        if (nameMatch) {
          candidates.push({
            key: 'contact_name',
            value: nameMatch[1].trim(),
            type: MemoryType.FACT,
            confidence: 0.95,
          });
        }

        // Extract meeting preference / time
        const timeMatch = text.match(/i\s+prefer\s+([a-zA-Z\s]+(?:morning|afternoon|evening|appointments|meetings))/i);
        if (timeMatch) {
          candidates.push({
            key: 'meeting_preference',
            value: timeMatch[1].trim(),
            type: MemoryType.USER_PREFERENCE,
            confidence: 0.85,
          });
        }

        // 3. Process each validated candidate
        for (const candidate of candidates) {
          // Secret detection & safety filter
          const sensitiveCheck = /-----BEGIN|bearer\s+|eyJ|sk-|ghp_|AKIA|password|secret_key|api_key/i.test(
            candidate.key + ' ' + candidate.value
          );
          if (sensitiveCheck) {
            console.warn(`[AIWorker] Candidate rejected by safety policy: ${candidate.key}`);
            continue;
          }

          const existingWhere: any = {
            organizationId,
            aiEmployeeId,
            key: candidate.key,
          };
          if (leadId) {
            existingWhere.leadId = leadId;
          } else {
            existingWhere.leadId = null;
          }

          const existing = await AIMemory.findOne({ where: existingWhere });

          if (existing) {
            await existing.update({
              value: candidate.value,
              confidence: candidate.confidence,
              source: MemorySource.CONVERSATION,
              type: candidate.type,
            });
            console.log(`[AIWorker] Updated memory [${candidate.key}] for employee ${aiEmployeeId}`);
          } else {
            // Check quota
            const count = await AIMemory.count({
              where: {
                organizationId,
                aiEmployeeId,
                ...(leadId ? { leadId } : { leadId: null }),
              },
            });

            if (count < 100) {
              await AIMemory.create({
                organizationId,
                aiEmployeeId,
                leadId: leadId || null,
                type: candidate.type,
                key: candidate.key,
                value: candidate.value,
                confidence: candidate.confidence,
                source: MemorySource.CONVERSATION,
                metadata: { extractedFromMessageId: messageId },
              });
              console.log(`[AIWorker] Created memory [${candidate.key}] for employee ${aiEmployeeId}`);
            }
          }
        }
      }
    },
    { connection: redisConnection }
  );

  return worker;
}

export function initDocumentWorker() {
  const worker = new Worker(
    'document-queue',
    async (job: Job) => {
      console.log(`[DocumentWorker] Processing Document task: ${job.name}, ID: ${job.id}`);

      if (job.name === 'process-document') {
        const { documentId, organizationId } = job.data;
        const doc = await Document.findOne({
          where: organizationId ? { id: documentId, organizationId } : { id: documentId },
        });
        if (!doc) {
          console.warn(`[DocumentWorker] Document ${documentId} not found`);
          return;
        }

        try {
          await doc.update({ status: DocumentStatus.PROCESSING });
          const chunkCount = await DocumentChunk.count({ where: { documentId: doc.id } });
          await doc.update({
            status: DocumentStatus.READY,
            chunkCount,
            errorMessage: null,
          });
          console.log(`[DocumentWorker] Document ${documentId} processed successfully (${chunkCount} chunks)`);
        } catch (err: any) {
          console.error(`[DocumentWorker] Failed to process document ${documentId}:`, err);
          await doc.update({
            status: DocumentStatus.FAILED,
            errorMessage: err.message || 'Background document processing failed',
          });
          throw err;
        }
      } else if (job.name === 'embed-document-chunk') {
        const { chunkId, embedding } = job.data;
        const chunk = await DocumentChunk.findByPk(chunkId);
        if (chunk) {
          if (embedding) {
            await chunk.update({ embedding });
          }
          console.log(`[DocumentWorker] Embedding saved for chunk ${chunkId}`);
        }
      }
    },
    { connection: redisConnection }
  );

  return worker;
}
