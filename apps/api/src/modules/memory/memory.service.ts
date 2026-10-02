import { AIMemory, AIEmployee, Lead } from '@cryptonion/db';
import { MemoryType, MemorySource } from '@cryptonion/shared';
import { MemoryPolicy } from './memory.policy';
import { Op } from 'sequelize';

export class MemoryService {
  /**
   * List structured memories for an AI Employee within a tenant
   */
  static async listMemories(
    organizationId: string,
    aiEmployeeId: string,
    filters?: {
      leadId?: string | null;
      type?: MemoryType;
      limit?: number;
    }
  ): Promise<AIMemory[]> {
    // IDOR Verification: Employee must belong to tenant
    const employee = await AIEmployee.findOne({ where: { id: aiEmployeeId, organizationId } });
    if (!employee) {
      return [];
    }

    const whereClause: any = {
      organizationId,
      aiEmployeeId,
    };

    if (filters?.leadId !== undefined) {
      whereClause.leadId = filters.leadId;
    }

    if (filters?.type) {
      whereClause.type = filters.type;
    }

    return AIMemory.findAll({
      where: whereClause,
      order: [
        ['createdAt', 'DESC'],
      ],
      limit: filters?.limit || 100,
    });
  }

  /**
   * Get single memory by ID with strict tenant scoping
   */
  static async getMemory(
    organizationId: string,
    aiEmployeeId: string,
    memoryId: string
  ): Promise<AIMemory | null> {
    return AIMemory.findOne({
      where: {
        id: memoryId,
        organizationId,
        aiEmployeeId,
      },
    });
  }

  /**
   * Create or upsert a structured memory
   */
  static async createMemory(
    organizationId: string,
    aiEmployeeId: string,
    data: {
      leadId?: string | null;
      type: MemoryType;
      key: string;
      value: string;
      confidence?: number;
      source?: MemorySource;
      metadata?: Record<string, any>;
    }
  ): Promise<AIMemory> {
    // 1. Verify AI Employee belongs to organization
    const employee = await AIEmployee.findOne({ where: { id: aiEmployeeId, organizationId } });
    if (!employee) {
      throw new Error('AI_EMPLOYEE_NOT_FOUND');
    }

    // 2. Verify Lead if specified
    if (data.leadId) {
      const lead = await Lead.findOne({ where: { id: data.leadId, organizationId } });
      if (!lead) {
        throw new Error('LEAD_NOT_FOUND');
      }
    }

    // 3. Validate safety and schema
    const validation = MemoryPolicy.validate({
      key: data.key,
      value: data.value,
      type: data.type,
      source: data.source,
      confidence: data.confidence,
    });

    if (!validation.valid) {
      const err = new Error(validation.error || 'Invalid memory payload');
      (err as any).code = 'VALIDATION_FAILED';
      throw err;
    }

    // 4. Check for existing record to determine if this is an upsert or new memory
    const existingWhere: any = {
      organizationId,
      aiEmployeeId,
      key: data.key.trim(),
    };
    if (data.leadId) {
      existingWhere.leadId = data.leadId;
    } else {
      existingWhere.leadId = null;
    }

    const existing = await AIMemory.findOne({ where: existingWhere });

    // 5. Quota validation
    if (!existing) {
      const count = await AIMemory.count({
        where: {
          organizationId,
          aiEmployeeId,
          ...(data.leadId ? { leadId: data.leadId } : { leadId: null }),
        },
      });

      const quotaCheck = MemoryPolicy.checkQuota(count, false);
      if (!quotaCheck.valid) {
        const err = new Error(quotaCheck.error);
        (err as any).code = 'QUOTA_EXCEEDED';
        throw err;
      }
    }

    // 6. Persist: update if exists, otherwise create
    if (existing) {
      await existing.update({
        type: data.type,
        value: data.value.trim(),
        confidence: data.confidence !== undefined ? data.confidence : 1.0,
        source: data.source || MemorySource.EXPLICIT_ADMIN,
        metadata: data.metadata || existing.metadata,
      });
      return existing;
    }

    return AIMemory.create({
      organizationId,
      aiEmployeeId,
      leadId: data.leadId || null,
      type: data.type,
      key: data.key.trim(),
      value: data.value.trim(),
      confidence: data.confidence !== undefined ? data.confidence : 1.0,
      source: data.source || MemorySource.EXPLICIT_ADMIN,
      metadata: data.metadata || {},
    });
  }

  /**
   * Update an existing memory
   */
  static async updateMemory(
    organizationId: string,
    aiEmployeeId: string,
    memoryId: string,
    data: {
      type?: MemoryType;
      value?: string;
      confidence?: number;
      source?: MemorySource;
      metadata?: Record<string, any>;
    }
  ): Promise<AIMemory | null> {
    const memory = await this.getMemory(organizationId, aiEmployeeId, memoryId);
    if (!memory) {
      return null;
    }

    if (data.value !== undefined || data.type !== undefined || data.confidence !== undefined || data.source !== undefined) {
      const validation = MemoryPolicy.validate({
        key: memory.key,
        value: data.value !== undefined ? data.value : memory.value,
        type: data.type !== undefined ? data.type : memory.type,
        source: data.source !== undefined ? data.source : memory.source,
        confidence: data.confidence !== undefined ? data.confidence : memory.confidence,
      });

      if (!validation.valid) {
        const err = new Error(validation.error || 'Invalid memory update');
        (err as any).code = 'VALIDATION_FAILED';
        throw err;
      }
    }

    await memory.update({
      ...(data.type ? { type: data.type } : {}),
      ...(data.value !== undefined ? { value: data.value.trim() } : {}),
      ...(data.confidence !== undefined ? { confidence: data.confidence } : {}),
      ...(data.source ? { source: data.source } : {}),
      ...(data.metadata ? { metadata: data.metadata } : {}),
    });

    return memory;
  }

  /**
   * Delete an existing memory
   */
  static async deleteMemory(
    organizationId: string,
    aiEmployeeId: string,
    memoryId: string
  ): Promise<boolean> {
    const memory = await this.getMemory(organizationId, aiEmployeeId, memoryId);
    if (!memory) {
      return false;
    }

    await memory.destroy();
    return true;
  }

  /**
   * Retrieve bounded active structured memories for context injection
   */
  static async getContextMemories(
    organizationId: string,
    aiEmployeeId: string,
    leadId?: string | null,
    limit: number = 20
  ): Promise<AIMemory[]> {
    const whereCondition: any = {
      organizationId,
      aiEmployeeId,
      [Op.or]: [
        { leadId: null },
        ...(leadId ? [{ leadId }] : []),
      ],
    };

    const memories = await AIMemory.findAll({
      where: whereCondition,
      order: [
        ['confidence', 'DESC'],
        ['createdAt', 'DESC'],
      ],
      limit,
    });

    // Deterministic priority ordering: INSTRUCTION -> USER_PREFERENCE -> FACT -> SYSTEM_NOTE
    const priorityOrder: Record<string, number> = {
      [MemoryType.INSTRUCTION]: 1,
      [MemoryType.USER_PREFERENCE]: 2,
      [MemoryType.FACT]: 3,
      [MemoryType.SYSTEM_NOTE]: 4,
    };

    return memories.sort((a, b) => {
      const prioA = priorityOrder[a.type] || 99;
      const prioB = priorityOrder[b.type] || 99;
      if (prioA !== prioB) return prioA - prioB;
      return b.confidence - a.confidence;
    });
  }
}
