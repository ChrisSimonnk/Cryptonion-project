import crypto from 'crypto';

/**
 * Calculates a deterministic 64-character hexadecimal SHA-256 checksum for a buffer or string.
 */
export function calculateChecksum(input: Buffer | string): string {
  const hash = crypto.createHash('sha256');
  hash.update(input);
  return hash.digest('hex');
}
