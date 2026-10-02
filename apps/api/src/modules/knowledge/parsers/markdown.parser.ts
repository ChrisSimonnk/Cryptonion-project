import { IDocumentParser, ParsedDocument } from './types';
import { normalizeText } from '../normalization';

export class MarkdownParser implements IDocumentParser {
  canParse(mimeType: string, filename: string): boolean {
    const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'));
    return mimeType === 'text/markdown' || mimeType === 'text/x-markdown' || ext === '.md' || ext === '.markdown';
  }

  async parse(buffer: Buffer, filename: string): Promise<ParsedDocument> {
    if (!buffer || buffer.length === 0) {
      throw new Error('EMPTY_DOCUMENT: Markdown content is empty');
    }

    const raw = buffer.toString('utf-8');
    const text = normalizeText(raw);

    if (!text || text.trim().length === 0) {
      throw new Error('EMPTY_DOCUMENT: No meaningful text found in Markdown file');
    }

    // Extract headings for metadata index
    const headingLines = text
      .split('\n')
      .filter((line) => line.trim().startsWith('#'))
      .map((line) => line.trim().replace(/^#+\s*/, ''));

    return {
      text,
      metadata: {
        filename,
        headings: headingLines,
      },
    };
  }
}
