import { describe, it, expect } from 'vitest';
import { Document, DocumentChunk, KnowledgeBase, Organization } from '../index';
import { DocumentStatus } from '@cryptonion/shared';

describe('Document Database Model & Associations (Phase 5A)', () => {
  it('instantiates valid Document model attributes', () => {
    const doc = Document.build({
      organizationId: '11111111-1111-1111-1111-111111111111',
      knowledgeBaseId: '22222222-2222-2222-2222-222222222222',
      filename: 'enterprise_security_policy.pdf',
      mimeType: 'application/pdf',
      fileSize: 1048576,
      checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      status: DocumentStatus.PENDING,
      chunkCount: 0,
      metadata: { department: 'Security' },
    });

    expect(doc.id).toBeDefined();
    expect(doc.organizationId).toBe('11111111-1111-1111-1111-111111111111');
    expect(doc.knowledgeBaseId).toBe('22222222-2222-2222-2222-222222222222');
    expect(doc.filename).toBe('enterprise_security_policy.pdf');
    expect(doc.mimeType).toBe('application/pdf');
    expect(doc.fileSize).toBe(1048576);
    expect(doc.checksum).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(doc.status).toBe(DocumentStatus.PENDING);
    expect(doc.chunkCount).toBe(0);
    expect(doc.metadata).toEqual({ department: 'Security' });
  });

  it('supports all DocumentStatus enum states', () => {
    const statuses = [
      DocumentStatus.PENDING,
      DocumentStatus.PROCESSING,
      DocumentStatus.READY,
      DocumentStatus.FAILED,
    ];

    for (const status of statuses) {
      const doc = Document.build({
        organizationId: '11111111-1111-1111-1111-111111111111',
        knowledgeBaseId: '22222222-2222-2222-2222-222222222222',
        filename: 'manual.txt',
        mimeType: 'text/plain',
        fileSize: 500,
        checksum: 'abc123hash',
        status,
      });
      expect(doc.status).toBe(status);
    }
  });

  it('instantiates DocumentChunk with optional documentId, chunkIndex, and pageNumber', () => {
    const chunk = DocumentChunk.build({
      knowledgeBaseId: '22222222-2222-2222-2222-222222222222',
      documentId: '33333333-3333-3333-3333-333333333333',
      chunkIndex: 0,
      pageNumber: 1,
      content: 'This is section 1 of the knowledge document.',
      metadata: { section: 'Overview' },
    });

    expect(chunk.id).toBeDefined();
    expect(chunk.knowledgeBaseId).toBe('22222222-2222-2222-2222-222222222222');
    expect(chunk.documentId).toBe('33333333-3333-3333-3333-333333333333');
    expect(chunk.chunkIndex).toBe(0);
    expect(chunk.pageNumber).toBe(1);
    expect(chunk.content).toBe('This is section 1 of the knowledge document.');
  });
});
