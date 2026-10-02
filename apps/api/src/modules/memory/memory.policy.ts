import { MemoryType, MemorySource } from '@cryptonion/shared';

export interface MemoryValidationResult {
  valid: boolean;
  error?: string;
}

export const MAX_MEMORIES_PER_SCOPE = parseInt(process.env.MAX_MEMORIES_PER_SCOPE || '100', 10);

// Secret patterns to prevent storing sensitive credentials or auth tokens in long-term memory
const SENSITIVE_PATTERNS = [
  /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/i,
  /bearer\s+[a-zA-Z0-9_\-\.=:_+/]{20,}/i,
  /eyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/,
  /sk-[a-zA-Z0-9_\-]{20,}/,
  /ghp_[a-zA-Z0-9]{20,}/,
  /AKIA[0-9A-Z]{16}/,
  /(?:password|passwd|pwd|secret_key|api_key|access_token)\s*[:=]\s*['"]?[a-zA-Z0-9!@#$%^&*()_+=\-`~]{6,}['"]?/i,
];

export class MemoryPolicy {
  /**
   * Validates key, value, type, source, and confidence for memory candidates
   */
  static validate(params: {
    key: string;
    value: string;
    type: MemoryType;
    source?: MemorySource;
    confidence?: number;
  }): MemoryValidationResult {
    const trimmedKey = (params.key || '').trim();
    const trimmedValue = (params.value || '').trim();

    if (!trimmedKey || trimmedKey.length === 0) {
      return { valid: false, error: 'Memory key cannot be empty or whitespace-only.' };
    }

    if (trimmedKey.length > 128) {
      return { valid: false, error: 'Memory key exceeds maximum length of 128 characters.' };
    }

    if (!trimmedValue || trimmedValue.length === 0) {
      return { valid: false, error: 'Memory value cannot be empty or whitespace-only.' };
    }

    if (trimmedValue.length > 2000) {
      return { valid: false, error: 'Memory value exceeds maximum length of 2000 characters.' };
    }

    if (!Object.values(MemoryType).includes(params.type)) {
      return { valid: false, error: `Invalid memory type: ${params.type}. Allowed: ${Object.values(MemoryType).join(', ')}` };
    }

    if (params.source && !Object.values(MemorySource).includes(params.source)) {
      return { valid: false, error: `Invalid memory source: ${params.source}. Allowed: ${Object.values(MemorySource).join(', ')}` };
    }

    if (params.confidence !== undefined) {
      if (typeof params.confidence !== 'number' || isNaN(params.confidence) || params.confidence < 0.0 || params.confidence > 1.0) {
        return { valid: false, error: 'Confidence must be a numeric value between 0.0 and 1.0.' };
      }
    }

    // Safety check: Detect obvious secrets & sensitive tokens
    const secretCheck = this.detectSecrets(trimmedKey + ' ' + trimmedValue);
    if (!secretCheck.valid) {
      return secretCheck;
    }

    return { valid: true };
  }

  /**
   * Scans text for credentials, private keys, or API tokens
   */
  static detectSecrets(text: string): MemoryValidationResult {
    for (const pattern of SENSITIVE_PATTERNS) {
      if (pattern.test(text)) {
        return {
          valid: false,
          error: 'Memory rejected by safety policy: Attempt to store credentials, tokens, or private keys.',
        };
      }
    }
    return { valid: true };
  }

  /**
   * Checks quota for the employee/lead scope
   */
  static checkQuota(currentCount: number, isUpdate: boolean = false): MemoryValidationResult {
    if (!isUpdate && currentCount >= MAX_MEMORIES_PER_SCOPE) {
      return {
        valid: false,
        error: `Memory quota exceeded. Maximum allowed memories (${MAX_MEMORIES_PER_SCOPE}) reached for this entity.`,
      };
    }
    return { valid: true };
  }
}
