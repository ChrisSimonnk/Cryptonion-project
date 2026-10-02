import { IDocumentParser, ParsedDocument } from './types';
import { normalizeText } from '../normalization';

export class TxtParser implements IDocumentParser {
  canParse(mimeType: string, filename: string): boolean {
    const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'));
    return mimeType === 'text/plain' || ext === '.txt';
  }

  async parse(buffer: Buffer, filename: string): Promise<ParsedDocument> {
    if (!buffer || buffer.length === 0) {
      throw new Error('EMPTY_DOCUMENT: File content is empty');
    }

    const raw = buffer.toString('utf-8');
    const text = normalizeText(raw);

    if (!text || text.trim().length === 0) {
      throw new Error('EMPTY_DOCUMENT: No meaningful text found in TXT file');
    }

    return {
      text,
      metadata: {
        filename,
        encoding: 'utf-8',
      },
    };
  }
}
