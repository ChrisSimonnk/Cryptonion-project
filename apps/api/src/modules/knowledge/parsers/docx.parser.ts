import mammoth from 'mammoth';
import { IDocumentParser, ParsedDocument } from './types';
import { normalizeText } from '../normalization';

export class DocxParser implements IDocumentParser {
  canParse(mimeType: string, filename: string): boolean {
    const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'));
    return (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimeType === 'application/msword' ||
      ext === '.docx' ||
      ext === '.doc'
    );
  }

  async parse(buffer: Buffer, filename: string): Promise<ParsedDocument> {
    if (!buffer || buffer.length === 0) {
      throw new Error('EMPTY_DOCUMENT: DOCX file is empty');
    }

    try {
      const result = await mammoth.extractRawText({ buffer });
      const text = normalizeText(result.value || '');

      if (!text || text.trim().length === 0) {
        throw new Error('CORRUPT_OR_EMPTY_DOCX: No readable text extracted from DOCX document');
      }

      return {
        text,
        metadata: {
          filename,
          warnings: result.messages || [],
        },
      };
    } catch (err: any) {
      if (err.message && (err.message.startsWith('CORRUPT') || err.message.startsWith('EMPTY'))) {
        throw err;
      }
      throw new Error(`CORRUPT_OR_EMPTY_DOCX: Failed to extract DOCX text (${err.message || 'malformed file'})`);
    }
  }
}
