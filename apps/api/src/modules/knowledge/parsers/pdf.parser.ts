import { IDocumentParser, ParsedDocument, ParsedDocumentPage } from './types';
import { normalizeText } from '../normalization';
const pdfParse = require('pdf-parse');

export class PdfParser implements IDocumentParser {
  canParse(mimeType: string, filename: string): boolean {
    const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'));
    return mimeType === 'application/pdf' || ext === '.pdf';
  }

  async parse(buffer: Buffer, filename: string): Promise<ParsedDocument> {
    if (!buffer || buffer.length === 0) {
      throw new Error('EMPTY_DOCUMENT: PDF file is empty');
    }

    const pages: ParsedDocumentPage[] = [];

    try {
      const options = {
        pagerender: function (pageData: any) {
          return pageData.getTextContent().then(function (textContent: any) {
            let lastY: number | null = null;
            let text = '';
            for (const item of textContent.items) {
              if (lastY === null || lastY === item.transform[5]) {
                text += item.str;
              } else {
                text += '\n' + item.str;
              }
              lastY = item.transform[5];
            }

            const pageText = normalizeText(text);
            pages.push({
              pageNumber: pageData.pageIndex + 1,
              text: pageText,
            });

            return pageText;
          });
        },
      };

      const data = await pdfParse(buffer, options);

      const fullRawText = pages.map((p) => p.text).join('\n\n') || data.text || '';
      const text = normalizeText(fullRawText);

      if (!text || text.trim().length === 0) {
        throw new Error('NO_EXTRACTABLE_TEXT: PDF contains no readable text or is image-only');
      }

      return {
        text,
        metadata: {
          filename,
          pageCount: data.numpages || pages.length || 1,
          pages: pages.sort((a, b) => a.pageNumber - b.pageNumber),
          info: data.info || {},
        },
      };
    } catch (err: any) {
      if (err.message && err.message.startsWith('NO_EXTRACTABLE_TEXT')) {
        throw err;
      }
      throw new Error(`NO_EXTRACTABLE_TEXT: Failed to parse PDF document (${err.message || 'encrypted or malformed'})`);
    }
  }
}
