import { ParsedDocumentPage } from './parsers/types';

export interface ChunkingOptions {
  chunkSize?: number;
  chunkOverlap?: number;
}

export interface GeneratedChunk {
  chunkIndex: number;
  content: string;
  pageNumber: number | null;
  metadata: Record<string, any>;
}

export const DEFAULT_CHUNK_SIZE = 1000;
export const DEFAULT_CHUNK_OVERLAP = 150;

/**
 * Deterministic text chunking engine.
 * Splits text on semantic boundaries (paragraphs, sentences, spaces) while adhering to
 * target chunkSize and overlap parameters. Preserves 0-indexed order and page metadata.
 */
export function chunkText(
  text: string,
  pages?: ParsedDocumentPage[],
  options?: ChunkingOptions
): GeneratedChunk[] {
  const chunkSize = options?.chunkSize && options.chunkSize > 0 ? options.chunkSize : DEFAULT_CHUNK_SIZE;
  const chunkOverlap =
    options?.chunkOverlap !== undefined && options.chunkOverlap >= 0
      ? Math.min(options.chunkOverlap, Math.floor(chunkSize / 2))
      : DEFAULT_CHUNK_OVERLAP;

  if (!text || text.trim().length === 0) {
    return [];
  }

  const cleanText = text.trim();
  const chunks: GeneratedChunk[] = [];

  // If text length is smaller than or equal to chunkSize, return single chunk
  if (cleanText.length <= chunkSize) {
    const pageNum = pages && pages.length > 0 ? findPageNumberForOffset(0, pages) : null;
    return [
      {
        chunkIndex: 0,
        content: cleanText,
        pageNumber: pageNum,
        metadata: {
          characterCount: cleanText.length,
        },
      },
    ];
  }

  let start = 0;
  let chunkIndex = 0;

  while (start < cleanText.length) {
    let end = start + chunkSize;

    if (end >= cleanText.length) {
      end = cleanText.length;
    } else {
      // Find optimal split point (paragraph break, sentence end, or whitespace)
      const optimalBreak = findOptimalBreak(cleanText, start, end, Math.max(start + 100, end - 300));
      if (optimalBreak > start) {
        end = optimalBreak;
      }
    }

    const chunkContent = cleanText.slice(start, end).trim();

    if (chunkContent.length > 0) {
      const pageNum = pages && pages.length > 0 ? findPageNumberForOffset(start, pages) : null;

      chunks.push({
        chunkIndex,
        content: chunkContent,
        pageNumber: pageNum,
        metadata: {
          startOffset: start,
          endOffset: end,
          characterCount: chunkContent.length,
        },
      });

      chunkIndex++;
    }

    if (end >= cleanText.length) {
      break;
    }

    // Advance start with overlap
    const nextStart = end - chunkOverlap;
    if (nextStart <= start) {
      start = end; // Prevent infinite loop
    } else {
      start = nextStart;
    }
  }

  return chunks;
}

/**
 * Finds optimal semantic break point within [searchMin, maxEnd].
 * Prioritizes: Paragraph (\n\n) > Sentence (. ! ?) > Line Break (\n) > Space (' ')
 */
function findOptimalBreak(text: string, start: number, maxEnd: number, searchMin: number): number {
  const substring = text.slice(searchMin, maxEnd);

  // 1. Check for Paragraph Break (\n\n)
  const paragraphIndex = substring.lastIndexOf('\n\n');
  if (paragraphIndex !== -1) {
    return searchMin + paragraphIndex + 2;
  }

  // 2. Check for Sentence Boundaries (. , ! , ?) followed by space or newline
  const sentenceMatches = Array.from(substring.matchAll(/[\.\!\?]\s/g));
  if (sentenceMatches.length > 0) {
    const lastSentence = sentenceMatches[sentenceMatches.length - 1];
    if (lastSentence.index !== undefined) {
      return searchMin + lastSentence.index + 1;
    }
  }

  // 3. Check for Line Break (\n)
  const lineIndex = substring.lastIndexOf('\n');
  if (lineIndex !== -1) {
    return searchMin + lineIndex + 1;
  }

  // 4. Check for Space (' ')
  const spaceIndex = substring.lastIndexOf(' ');
  if (spaceIndex !== -1) {
    return searchMin + spaceIndex + 1;
  }

  // Fallback to hard maxEnd
  return maxEnd;
}

/**
 * Helper to associate character offset with PDF page number
 */
function findPageNumberForOffset(offset: number, pages: ParsedDocumentPage[]): number | null {
  if (!pages || pages.length === 0) return null;

  let currentOffset = 0;
  for (const page of pages) {
    const pageLength = page.text.length;
    if (offset >= currentOffset && offset <= currentOffset + pageLength + 10) {
      return page.pageNumber;
    }
    currentOffset += pageLength + 2;
  }

  return pages[pages.length - 1].pageNumber;
}
