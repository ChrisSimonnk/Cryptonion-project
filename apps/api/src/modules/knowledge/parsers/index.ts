import { IDocumentParser } from './types';
import { TxtParser } from './txt.parser';
import { MarkdownParser } from './markdown.parser';
import { PdfParser } from './pdf.parser';
import { DocxParser } from './docx.parser';

export * from './types';
export * from './txt.parser';
export * from './markdown.parser';
export * from './pdf.parser';
export * from './docx.parser';

const registeredParsers: IDocumentParser[] = [
  new TxtParser(),
  new MarkdownParser(),
  new PdfParser(),
  new DocxParser(),
];

export function getParser(mimeType: string, filename: string): IDocumentParser {
  const parser = registeredParsers.find((p) => p.canParse(mimeType, filename));
  if (!parser) {
    throw new Error(
      `UNSUPPORTED_MIME_TYPE: File type '${mimeType}' or filename extension for '${filename}' is not supported. Supported types: .txt, .md, .pdf, .docx`
    );
  }
  return parser;
}
