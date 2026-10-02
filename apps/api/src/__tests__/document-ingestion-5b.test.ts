import { describe, it, expect, beforeAll, vi } from 'vitest';
import { TxtParser } from '../modules/knowledge/parsers/txt.parser';
import { MarkdownParser } from '../modules/knowledge/parsers/markdown.parser';
import { PdfParser } from '../modules/knowledge/parsers/pdf.parser';
import { DocxParser } from '../modules/knowledge/parsers/docx.parser';
import { getParser } from '../modules/knowledge/parsers';
import { normalizeText } from '../modules/knowledge/normalization';
import { calculateChecksum } from '../modules/knowledge/checksum';
import { chunkText } from '../modules/knowledge/chunking';
import { DocumentIngestionService } from '../modules/knowledge/document.service';
import { KnowledgeBase, Document, DocumentChunk, sequelize } from '@cryptonion/db';
import { DocumentStatus } from '@cryptonion/shared';

describe('PHASE 5B: File Parsing & Deterministic Chunking Suite', () => {
  // -------------------------------------------------------------
  // 1. TXT Parser Tests
  // -------------------------------------------------------------
  describe('TXT Parser', () => {
    const parser = new TxtParser();

    it('parses valid UTF-8 text and normalizes line endings', async () => {
      const buffer = Buffer.from('Header Line\r\n\r\n\r\nSection 1 text.\r\nSection 2 text with Unicode: 🚀 Health Care System.');
      const res = await parser.parse(buffer, 'test.txt');

      expect(res.text).toContain('Header Line');
      expect(res.text).toContain('Section 1 text.');
      expect(res.text).toContain('🚀 Health Care System.');
      expect(res.text).not.toContain('\r');
      expect(res.text).not.toContain('\n\n\n');
    });

    it('rejects empty or whitespace-only TXT files', async () => {
      const emptyBuf = Buffer.from('   \n\n\r\n   ');
      await expect(parser.parse(emptyBuf, 'empty.txt')).rejects.toThrow('EMPTY_DOCUMENT');
    });
  });

  // -------------------------------------------------------------
  // 2. Markdown Parser Tests
  // -------------------------------------------------------------
  describe('Markdown Parser', () => {
    const parser = new MarkdownParser();

    it('preserves headings, lists, and extracts heading metadata', async () => {
      const mdContent = `# Cryptonion Product Overview

This is our AI Employee platform.

## Key Features
- High Performance
- Deterministic RAG
- HIPAA Security

### Architecture Details
Detailed text content here.`;

      const res = await parser.parse(Buffer.from(mdContent), 'overview.md');

      expect(res.text).toContain('# Cryptonion Product Overview');
      expect(res.text).toContain('- High Performance');
      expect(res.metadata.headings).toEqual([
        'Cryptonion Product Overview',
        'Key Features',
        'Architecture Details',
      ]);
    });

    it('rejects empty markdown files', async () => {
      await expect(parser.parse(Buffer.from('  '), 'empty.md')).rejects.toThrow('EMPTY_DOCUMENT');
    });
  });

  // -------------------------------------------------------------
  // 3. Parser Registry & Validation
  // -------------------------------------------------------------
  describe('Parser Registry & Validation', () => {
    it('selects correct parser based on MIME type or extension', () => {
      expect(getParser('text/plain', 'doc.txt')).toBeInstanceOf(TxtParser);
      expect(getParser('text/markdown', 'doc.md')).toBeInstanceOf(MarkdownParser);
      expect(getParser('application/pdf', 'doc.pdf')).toBeInstanceOf(PdfParser);
      expect(
        getParser(
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'doc.docx'
        )
      ).toBeInstanceOf(DocxParser);
    });

    it('rejects unsupported file formats', () => {
      expect(() => getParser('application/x-msdownload', 'malicious.exe')).toThrow(
        'UNSUPPORTED_MIME_TYPE'
      );
    });
  });

  // -------------------------------------------------------------
  // 4. Text Normalization Pipeline Tests
  // -------------------------------------------------------------
  describe('Text Normalization Pipeline', () => {
    it('converts CRLF to LF, strips null bytes, and collapses excessive blank lines', () => {
      const raw = "Title\r\n\r\n\r\n\r\nParagraph 1\0 text.\r\n\r\n\r\nParagraph 2.\n\n\n";
      const normalized = normalizeText(raw);

      expect(normalized).toBe("Title\n\nParagraph 1 text.\n\nParagraph 2.");
    });
  });

  // -------------------------------------------------------------
  // 5. SHA-256 Checksum Tests
  // -------------------------------------------------------------
  describe('Checksum Calculation', () => {
    it('generates a deterministic 64-character SHA-256 hash', () => {
      const buf1 = Buffer.from('Cryptonion Knowledge Document Content');
      const hash1 = calculateChecksum(buf1);
      const hash2 = calculateChecksum(buf1);

      expect(hash1).toHaveLength(64);
      expect(hash1).toBe(hash2);

      const buf2 = Buffer.from('Modified Document Content');
      expect(calculateChecksum(buf2)).not.toBe(hash1);
    });
  });

  // -------------------------------------------------------------
  // 6. Deterministic Chunking Engine Tests
  // -------------------------------------------------------------
  describe('Deterministic Chunking Engine', () => {
    it('chunks short text into single 0-indexed chunk', () => {
      const text = 'Short document content for testing.';
      const chunks = chunkText(text);

      expect(chunks).toHaveLength(1);
      expect(chunks[0].chunkIndex).toEqual(0);
      expect(chunks[0].content).toBe(text);
      expect(chunks[0].pageNumber).toBeNull();
    });

    it('chunks long text into deterministic sequence with overlap and paragraph boundaries', () => {
      const paragraph1 = 'A'.repeat(600);
      const paragraph2 = 'B'.repeat(600);
      const fullText = `${paragraph1}\n\n${paragraph2}`;

      const chunks = chunkText(fullText, undefined, { chunkSize: 700, chunkOverlap: 100 });

      expect(chunks.length).toBeGreaterThanOrEqual(2);
      expect(chunks[0].chunkIndex).toBe(0);
      expect(chunks[1].chunkIndex).toBe(1);
      expect(chunks[0].content.length).toBeLessThanOrEqual(750);
      expect(chunks[0].content).toContain(paragraph1);
    });

    it('assigns pageNumber metadata for PDF pages', () => {
      const pages = [
        { pageNumber: 1, text: 'Page 1 Header\n\n' + 'X'.repeat(1200) },
        { pageNumber: 2, text: 'Page 2 Header\n\n' + 'Y'.repeat(1200) },
      ];
      const fullText = pages.map((p) => p.text).join('\n\n');

      const chunks = chunkText(fullText, pages, { chunkSize: 700, chunkOverlap: 50 });

      expect(chunks.length).toBeGreaterThanOrEqual(2);
      expect(chunks[0].pageNumber).toBe(1);
      const hasPage2 = chunks.some((c) => c.pageNumber === 2);
      expect(hasPage2).toBe(true);
    });
  });

  // -------------------------------------------------------------
  // 7. Full Ingestion Lifecycle & Security Spies
  // -------------------------------------------------------------
  describe('Document Ingestion Lifecycle & Security Matrix', () => {
    const validOrgId = '11111111-1111-1111-1111-111111111111';
    const validKbId = '22222222-2222-2222-2222-222222222222';

    const docsStore: any[] = [];
    const chunksStore: any[] = [];

    beforeAll(() => {
      vi.spyOn(KnowledgeBase, 'findOne').mockImplementation(async (options: any) => {
        const where = options?.where || {};
        if (where.id === validKbId && where.organizationId === validOrgId) {
          return KnowledgeBase.build({
            id: validKbId,
            organizationId: validOrgId,
            name: 'Test KB',
            chunkCount: 0,
          }) as any;
        }
        return null;
      });

      vi.spyOn(Document, 'create').mockImplementation(async (data: any) => {
        const docInstance = Document.build({
          id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          ...data,
          status: DocumentStatus.PENDING,
          chunkCount: 0,
        });

        docInstance.update = vi.fn(async (updateData: any) => {
          Object.assign(docInstance, updateData);
          const existing = docsStore.find((d) => d.id === docInstance.id);
          if (existing) Object.assign(existing, updateData);
          return docInstance;
        }) as any;

        docInstance.reload = vi.fn(async () => docInstance) as any;

        docsStore.push(docInstance);
        return docInstance as any;
      });

      vi.spyOn(Document, 'findOne').mockImplementation(async (options: any) => {
        const where = options?.where || {};
        return docsStore.find((d) => {
          if (where.id && d.id !== where.id) return false;
          if (where.filename && d.filename !== where.filename) return false;
          if (where.organizationId && d.organizationId !== where.organizationId) return false;
          return true;
        }) as any;
      });

      vi.spyOn(DocumentChunk, 'destroy').mockImplementation(async (options: any) => {
        const where = options?.where || {};
        if (where.documentId) {
          for (let i = chunksStore.length - 1; i >= 0; i--) {
            if (chunksStore[i].documentId === where.documentId) {
              chunksStore.splice(i, 1);
            }
          }
        }
        return 1 as any;
      });

      vi.spyOn(DocumentChunk, 'bulkCreate').mockImplementation(async (records: readonly any[]) => {
        const created = records.map((r, idx) =>
          DocumentChunk.build({
            id: `chunk-${idx}-${Date.now()}`,
            ...r,
          })
        );
        chunksStore.push(...created);
        return created as any;
      });

      vi.spyOn(sequelize, 'transaction').mockImplementation(async (callback: any) => {
        return callback({});
      });
    });

    it('successfully ingests valid document from PENDING -> PROCESSING -> READY', async () => {
      const content = '# Emergency Triage Protocols\n\nPatients with SpO2 below 92% require immediate oxygen therapy.\n\n## Vital Thresholds\n- HR: 60-100 bpm';
      const fileBuffer = Buffer.from(content);

      const doc = await DocumentIngestionService.ingestDocument({
        organizationId: validOrgId,
        knowledgeBaseId: validKbId,
        filename: 'triage_protocols.md',
        mimeType: 'text/markdown',
        fileBuffer,
      });

      expect(doc.id).toBeDefined();
      expect(doc.status).toBe(DocumentStatus.READY);
      expect(doc.chunkCount).toBeGreaterThan(0);
      expect(doc.checksum).toHaveLength(64);
      expect(doc.errorMessage).toBeNull();
    });

    it('rejects oversized files exceeding configurable size limit with FILE_TOO_LARGE', async () => {
      const largeBuffer = Buffer.alloc(1024 * 1024);

      await expect(
        DocumentIngestionService.ingestDocument({
          organizationId: validOrgId,
          knowledgeBaseId: validKbId,
          filename: 'large_file.txt',
          mimeType: 'text/plain',
          fileBuffer: largeBuffer,
          options: { maxFileSize: 500 * 1024 },
        })
      ).rejects.toThrow('FILE_TOO_LARGE');
    });

    it('enforces tenant isolation and rejects cross-tenant KnowledgeBase ingestion attempts', async () => {
      await expect(
        DocumentIngestionService.ingestDocument({
          organizationId: 'foreign-org-999',
          knowledgeBaseId: validKbId,
          filename: 'unauthorized.txt',
          mimeType: 'text/plain',
          fileBuffer: Buffer.from('Unauthorized payload'),
        })
      ).rejects.toThrow('NOT_FOUND');
    });

    it('handles ingestion failure safely, marks document FAILED, and cleans up partial chunks', async () => {
      const emptyBuffer = Buffer.from('   \n   ');

      await expect(
        DocumentIngestionService.ingestDocument({
          organizationId: validOrgId,
          knowledgeBaseId: validKbId,
          filename: 'empty_failure.txt',
          mimeType: 'text/plain',
          fileBuffer: emptyBuffer,
        })
      ).rejects.toThrow('EMPTY_DOCUMENT');

      const failedDoc = await Document.findOne({
        where: { filename: 'empty_failure.txt', organizationId: validOrgId },
      });

      expect(failedDoc).not.toBeNull();
      expect(failedDoc?.status).toBe(DocumentStatus.FAILED);
      expect(failedDoc?.errorMessage).toContain('EMPTY_DOCUMENT');
    });
  });
});
