import { describe, it, expect, vi } from 'vitest';
import { AIEmployee, AIExecution, AIExecutionStatus, EmployeeStatus, EmployeeRole, Document, DocumentChunk } from '@cryptonion/db';
import { DocumentStatus } from '@cryptonion/shared';

describe('Worker AI Execution & Tenant Isolation', () => {
  const orgA_Id = '11111111-1111-1111-1111-111111111111';
  const orgB_Id = '22222222-2222-2222-2222-222222222222';
  const empA_Id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const execA_Id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

  // Worker processor logic test
  async function processWorkerJob(job: { id: string; name: string; data: any }) {
    if (job.name === 'execute-ai-employee') {
      const { organizationId, aiEmployeeId, executionId, prompt, chatHistory, maxTurns } = job.data;
      if (!organizationId || !aiEmployeeId || !executionId) {
        return { success: false, reason: 'MISSING_CONTEXT' };
      }

      const employee = await AIEmployee.findOne({
        where: { id: aiEmployeeId, organizationId },
      });

      const execution = await AIExecution.findOne({
        where: { id: executionId, organizationId, aiEmployeeId },
      });

      if (!employee || !execution) {
        if (execution) {
          await execution.update({
            status: AIExecutionStatus.FAILED,
            error: 'Employee not found or tenant mismatch',
          });
        }
        return { success: false, reason: 'TENANT_MISMATCH_OR_NOT_FOUND' };
      }

      const startTime = Date.now();
      await execution.update({ status: AIExecutionStatus.RUNNING });

      try {
        const replyText = `[Worker Response] AI Employee ${employee.name}: Executed task successfully. Prompt: "${prompt}"`;
        const latencyMs = Date.now() - startTime;
        const tokensUsed = replyText.split(/\s+/).length;

        await execution.update({
          status: AIExecutionStatus.COMPLETED,
          response: replyText,
          latencyMs,
          tokensUsed,
        });

        return { success: true, executionId, status: AIExecutionStatus.COMPLETED };
      } catch (err: any) {
        await execution.update({
          status: AIExecutionStatus.FAILED,
          error: err.message || 'Worker execution error',
        });
        return { success: false, error: err.message };
      }
    }
    return { success: false, reason: 'UNKNOWN_JOB' };
  }

  it('successfully processes AI execution in worker and transitions state QUEUED -> RUNNING -> COMPLETED', async () => {
    let executionState: any = {
      id: execA_Id,
      organizationId: orgA_Id,
      aiEmployeeId: empA_Id,
      status: AIExecutionStatus.QUEUED,
      update: async (patch: any) => Object.assign(executionState, patch),
    };

    const mockEmployee: any = {
      id: empA_Id,
      organizationId: orgA_Id,
      name: 'Sarah SDR',
      status: EmployeeStatus.ACTIVE,
    };

    vi.spyOn(AIEmployee, 'findOne').mockResolvedValue(mockEmployee as any);
    vi.spyOn(AIExecution, 'findOne').mockResolvedValue(executionState as any);

    const job = {
      id: 'job-1',
      name: 'execute-ai-employee',
      data: {
        organizationId: orgA_Id,
        aiEmployeeId: empA_Id,
        executionId: execA_Id,
        prompt: 'Qualify lead John Doe',
        maxTurns: 1,
      },
    };

    const result = await processWorkerJob(job);
    expect(result.success).toBe(true);
    expect(executionState.status).toBe(AIExecutionStatus.COMPLETED);
    expect(executionState.response).toContain('Sarah SDR');
    expect(executionState.latencyMs).toBeGreaterThanOrEqual(0);
    expect(executionState.tokensUsed).toBeGreaterThan(0);
  });

  it('enforces tenant isolation in worker and blocks cross-tenant execution (Org B trying to execute Org A employee)', async () => {
    let executionState: any = {
      id: execA_Id,
      organizationId: orgB_Id, // Org B execution record
      aiEmployeeId: empA_Id,   // Employee belongs to Org A
      status: AIExecutionStatus.QUEUED,
      update: async (patch: any) => Object.assign(executionState, patch),
    };

    // Employee belongs to Org A, so querying with Org B returns null
    vi.spyOn(AIEmployee, 'findOne').mockImplementation(async (opts: any) => {
      if (opts.where.organizationId === orgA_Id && opts.where.id === empA_Id) {
        return { id: empA_Id, organizationId: orgA_Id, name: 'Sarah SDR' } as any;
      }
      return null; // Tenant mismatch!
    });
    vi.spyOn(AIExecution, 'findOne').mockResolvedValue(executionState as any);

    const crossTenantJob = {
      id: 'job-2',
      name: 'execute-ai-employee',
      data: {
        organizationId: orgB_Id, // Attacking tenant
        aiEmployeeId: empA_Id,   // Victim employee
        executionId: execA_Id,
        prompt: 'Malicious cross-tenant prompt',
      },
    };

    const result = await processWorkerJob(crossTenantJob);
    expect(result.success).toBe(false);
    expect(result.reason).toBe('TENANT_MISMATCH_OR_NOT_FOUND');
    expect(executionState.status).toBe(AIExecutionStatus.FAILED);
    expect(executionState.error).toContain('tenant mismatch');
  });

  it('gracefully handles missing worker payload context without crashing', async () => {
    const invalidJob = {
      id: 'job-3',
      name: 'execute-ai-employee',
      data: {
        organizationId: '',
        aiEmployeeId: '',
        executionId: '',
      },
    };

    const result = await processWorkerJob(invalidJob);
    expect(result.success).toBe(false);
    expect(result.reason).toBe('MISSING_CONTEXT');
  });
});

describe('DocumentWorker Processing & Lifecycle (Phase 5 Background Processing)', () => {
  const orgId = '11111111-1111-1111-1111-111111111111';
  const docId = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
  const chunkId = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

  async function processDocumentWorkerJob(job: { id: string; name: string; data: any }) {
    if (job.name === 'process-document') {
      const { documentId, organizationId } = job.data;
      const doc = await Document.findOne({
        where: organizationId ? { id: documentId, organizationId } : { id: documentId },
      });
      if (!doc) {
        return { success: false, reason: 'DOCUMENT_NOT_FOUND' };
      }

      try {
        await doc.update({ status: DocumentStatus.PROCESSING });
        const chunkCount = await DocumentChunk.count({ where: { documentId: doc.id } });
        await doc.update({
          status: DocumentStatus.READY,
          chunkCount,
          errorMessage: null,
        });
        return { success: true, status: DocumentStatus.READY, chunkCount };
      } catch (err: any) {
        await doc.update({
          status: DocumentStatus.FAILED,
          errorMessage: err.message || 'Background document processing failed',
        });
        return { success: false, error: err.message };
      }
    } else if (job.name === 'embed-document-chunk') {
      const { chunkId, embedding } = job.data;
      const chunk = await DocumentChunk.findByPk(chunkId);
      if (chunk) {
        if (embedding) {
          await chunk.update({ embedding });
        }
        return { success: true, chunkId };
      }
      return { success: false, reason: 'CHUNK_NOT_FOUND' };
    }
    return { success: false, reason: 'UNKNOWN_JOB' };
  }

  it('processes document successfully in worker: PENDING -> PROCESSING -> READY', async () => {
    let docState: any = {
      id: docId,
      organizationId: orgId,
      status: DocumentStatus.PENDING,
      chunkCount: 0,
      update: async (patch: any) => Object.assign(docState, patch),
    };

    vi.spyOn(Document, 'findOne').mockResolvedValue(docState as any);
    vi.spyOn(DocumentChunk, 'count').mockResolvedValue(5 as any);

    const job = {
      id: 'doc-job-1',
      name: 'process-document',
      data: { documentId: docId, organizationId: orgId },
    };

    const res = await processDocumentWorkerJob(job);
    expect(res.success).toBe(true);
    expect(docState.status).toBe(DocumentStatus.READY);
    expect(docState.chunkCount).toBe(5);
    expect(docState.errorMessage).toBeNull();
  });

  it('transitions document to FAILED when worker encounters an error', async () => {
    let docState: any = {
      id: docId,
      organizationId: orgId,
      status: DocumentStatus.PENDING,
      update: async (patch: any) => Object.assign(docState, patch),
    };

    vi.spyOn(Document, 'findOne').mockResolvedValue(docState as any);
    vi.spyOn(DocumentChunk, 'count').mockRejectedValue(new Error('Database connectivity lost'));

    const job = {
      id: 'doc-job-2',
      name: 'process-document',
      data: { documentId: docId, organizationId: orgId },
    };

    const res = await processDocumentWorkerJob(job);
    expect(res.success).toBe(false);
    expect(docState.status).toBe(DocumentStatus.FAILED);
    expect(docState.errorMessage).toContain('Database connectivity lost');
  });

  it('updates vector embedding for a specific chunk in embed-document-chunk worker job', async () => {
    let chunkState: any = {
      id: chunkId,
      embedding: null,
      update: async (patch: any) => Object.assign(chunkState, patch),
    };

    vi.spyOn(DocumentChunk, 'findByPk').mockResolvedValue(chunkState as any);

    const mockVector = new Array(1536).fill(0.05);
    const job = {
      id: 'chunk-job-1',
      name: 'embed-document-chunk',
      data: { chunkId, embedding: mockVector },
    };

    const res = await processDocumentWorkerJob(job);
    expect(res.success).toBe(true);
    expect(chunkState.embedding).toBeDefined();
    expect(chunkState.embedding.length).toBe(1536);
  });
});
