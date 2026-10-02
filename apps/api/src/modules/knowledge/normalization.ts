/**
 * Centralized text normalization pipeline for Phase 5B ingestion.
 * Normalizes line endings, removes null bytes, collapses excessive blank lines,
 * and trims leading/trailing whitespace while preserving semantic paragraph boundaries.
 */
export function normalizeText(rawText: string): string {
  if (!rawText) return '';

  // 1. Convert CRLF (\r\n) and CR (\r) to LF (\n)
  let text = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // 2. Remove null bytes (\0) and control characters except \n and \t
  text = text.replace(/[\0\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // 3. Trim trailing spaces on each line
  text = text
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n');

  // 4. Collapse 3+ consecutive newlines into 2 newlines (preserve paragraph boundaries)
  text = text.replace(/\n{3,}/g, '\n\n');

  // 5. Final outer trim
  return text.trim();
}
