export interface ParsedDocumentPage {
  pageNumber: number;
  text: string;
}

export interface ParsedDocumentMetadata {
  pageCount?: number;
  pages?: ParsedDocumentPage[];
  headings?: string[];
  [key: string]: any;
}

export interface ParsedDocument {
  text: string;
  metadata: ParsedDocumentMetadata;
}

export interface IDocumentParser {
  canParse(mimeType: string, filename: string): boolean;
  parse(buffer: Buffer, filename: string): Promise<ParsedDocument>;
}
