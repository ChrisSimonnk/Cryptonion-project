import { exec } from 'child_process';
import { promisify } from 'util';
import { z } from 'zod';
import { buildApp } from '../apps/api/src/app';
import { Role, EmployeeRole, EmployeeStatus, AIExecutionStatus } from '@cryptonion/shared';
import { AIEmployee, AIExecution } from '@cryptonion/db';

const execAsync = promisify(exec);

// Exact expected schema contracts
const HealthResponseSchema = z.object({
  status: z.enum(['ok', 'degraded']),
  timestamp: z.string(),
  database: z.string().optional(),
  version: z.string().optional(),
  service: z.string().optional(),
});

const ErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().optional(),
  }),
});

const FastifyValidationErrorSchema = z.object({
  statusCode: z.number(),
  error: z.string(),
  message: z.string(),
});

const AIEmployeeResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    id: z.string().uuid(),
    organizationId: z.string().uuid(),
    name: z.string().min(1),
    description: z.string().nullable().optional(),
    avatarUrl: z.string().nullable().optional(),
    role: z.nativeEnum(EmployeeRole),
    status: z.nativeEnum(EmployeeStatus),
    voiceConfig: z.object({
      provider: z.string(),
      voiceId: z.string(),
      speed: z.number(),
      pitch: z.number(),
      temperature: z.number().optional(),
    }),
    llmConfig: z.object({
      provider: z.string(),
      model: z.string(),
      temperature: z.number(),
      maxTokens: z.number(),
      systemPrompt: z.string(),
    }),
    tools: z.array(z.any()),
    phoneNumber: z.string().nullable().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
});

const AIEmployeeListResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(AIEmployeeResponseSchema.shape.data),
});

const AIExecutionResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    executionId: z.string().uuid(),
    aiEmployeeId: z.string().uuid(),
    status: z.literal(AIExecutionStatus.COMPLETED),
    reply: z.string().min(1),
    provider: z.string(),
    model: z.string(),
    tokensUsed: z.number().int().nonnegative(),
    latencyMs: z.number().int().nonnegative(),
  }),
});

const AIExecutionListResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(
    z.object({
      id: z.string().uuid(),
      organizationId: z.string().uuid(),
      aiEmployeeId: z.string().uuid(),
      status: z.nativeEnum(AIExecutionStatus),
      provider: z.string(),
      model: z.string(),
      prompt: z.string(),
      response: z.string().nullable().optional(),
      latencyMs: z.number().nullable().optional(),
      tokensUsed: z.number().nullable().optional(),
      createdAt: z.string(),
    })
  ),
});

async function main() {
  console.log('================================================================');
  console.log('🔬 EXHAUSTIVE BODY RESPONSE SCHEMA VALIDATION SUITE');
  console.log('================================================================\n');

  const employeesStore: any[] = [];
  const executionsStore: any[] = [];

  (AIEmployee as any).findAll = async (options: any) => {
    const where = options?.where || {};
    return employeesStore.filter((emp) => {
      if (where.organizationId && emp.organizationId !== where.organizationId) return false;
      return true;
    });
  };

  (AIEmployee as any).findOne = async (options: any) => {
    const where = options?.where || {};
    const found = employeesStore.find((emp) => {
      if (where.id && emp.id !== where.id) return false;
      if (where.organizationId && emp.organizationId !== where.organizationId) return false;
      return true;
    });
    if (!found) return null;
    found.update = async (patch: any) => {
      Object.assign(found, patch);
      return found;
    };
    return found;
  };

  (AIEmployee as any).create = async (data: any) => {
    const emp = {
      id: data.id || '123e4567-e89b-12d3-a456-426614174001',
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      update: async (patch: any) => Object.assign(emp, patch),
    };
    employeesStore.push(emp);
    return emp;
  };

  (AIExecution as any).create = async (data: any) => {
    const exec = {
      id: data.id || '123e4567-e89b-12d3-a456-426614174002',
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      update: async (patch: any) => Object.assign(exec, patch),
    };
    executionsStore.push(exec);
    return exec;
  };

  (AIExecution as any).findAll = async (options: any) => {
    const where = options?.where || {};
    return executionsStore.filter((exec) => {
      if (where.organizationId && exec.organizationId !== where.organizationId) return false;
      if (where.aiEmployeeId && exec.aiEmployeeId !== where.aiEmployeeId) return false;
      return true;
    });
  };

  const app = await buildApp();
  await app.listen({ port: 3098, host: '127.0.0.1' });
  const baseUrl = 'http://127.0.0.1:3098';

  const orgA_Id = '11111111-1111-1111-1111-111111111111';
  const orgB_Id = '22222222-2222-2222-2222-222222222222';
  const userA_Id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const userB_Id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

  const adminTokenA = app.jwt.sign({
    userId: userA_Id,
    email: 'admin@org-a.com',
    organizationId: orgA_Id,
    membershipId: 'mem-admin-a',
    role: Role.ADMIN,
  });

  const viewerTokenA = app.jwt.sign({
    userId: userA_Id,
    email: 'viewer@org-a.com',
    organizationId: orgA_Id,
    membershipId: 'mem-viewer-a',
    role: Role.VIEWER,
  });

  const adminTokenB = app.jwt.sign({
    userId: userB_Id,
    email: 'admin@org-b.com',
    organizationId: orgB_Id,
    membershipId: 'mem-admin-b',
    role: Role.ADMIN,
  });

  let createdEmployeeId = '';
  let validatedCount = 0;

  async function testAndValidateBody(
    name: string,
    curlCmd: string,
    schema: z.ZodTypeAny
  ): Promise<any> {
    console.log(`🔍 [Validating Response Body] ${name}`);
    const { stdout } = await execAsync(curlCmd);
    const body = JSON.parse(stdout);
    
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      console.error(`❌ Body Schema Validation Failed:`, JSON.stringify(parsed.error.errors, null, 2));
      console.error(`Received Body:`, JSON.stringify(body, null, 2));
      throw new Error(`Schema mismatch in ${name}`);
    }

    console.log(`✅ Body verified against contract:`);
    console.log(JSON.stringify(body, null, 2));
    console.log('----------------------------------------------------------------\n');
    validatedCount++;
    return body;
  }

  // 1. Health Body
  await testAndValidateBody(
    'GET /health (Public Health Body)',
    `curl -s -X GET "${baseUrl}/health"`,
    HealthResponseSchema
  );

  // 2. Unauthenticated 401 Body
  await testAndValidateBody(
    'GET /api/ai-employees (401 Unauthorized Body)',
    `curl -s -X GET "${baseUrl}/api/ai-employees"`,
    ErrorResponseSchema
  );

  // 3. 403 Forbidden Body
  await testAndValidateBody(
    'POST /api/ai-employees (403 Forbidden Body for VIEWER role)',
    `curl -s -X POST "${baseUrl}/api/ai-employees" -H "Authorization: Bearer ${viewerTokenA}" -H "Content-Type: application/json" -d '{"name":"Bot","llmConfig":{"provider":"ollama","model":"llama3:8b","temperature":0.7,"maxTokens":512,"systemPrompt":"You are an agent."}}'`,
    ErrorResponseSchema
  );

  // 4. 400 Validation Error Body
  await testAndValidateBody(
    'POST /api/ai-employees (400 Validation Error Body)',
    `curl -s -X POST "${baseUrl}/api/ai-employees" -H "Authorization: Bearer ${adminTokenA}" -H "Content-Type: application/json" -d '{"name":"Bot","llmConfig":{"provider":"ollama","model":"llama3:8b","temperature":-0.5,"maxTokens":512,"systemPrompt":"You are an agent."}}'`,
    FastifyValidationErrorSchema
  );

  // 5. 201 Created Employee Body
  const createdBody = await testAndValidateBody(
    'POST /api/ai-employees (201 Created Employee Body)',
    `curl -s -X POST "${baseUrl}/api/ai-employees" -H "Authorization: Bearer ${adminTokenA}" -H "Content-Type: application/json" -d '{
      "name": "Maya Senior SDR",
      "role": "SALES_REP",
      "status": "DRAFT",
      "llmConfig": {
        "provider": "ollama",
        "model": "llama3:8b",
        "temperature": 0.7,
        "maxTokens": 512,
        "systemPrompt": "You are Maya, an autonomous enterprise sales SDR."
      },
      "voiceConfig": {
        "provider": "piper",
        "voiceId": "en_US-lessac-medium",
        "speed": 1.0,
        "pitch": 1.0
      }
    }'`,
    AIEmployeeResponseSchema
  );
  createdEmployeeId = createdBody.data.id;

  // 6. List Employees Body
  await testAndValidateBody(
    'GET /api/ai-employees (200 List Employees Body)',
    `curl -s -X GET "${baseUrl}/api/ai-employees" -H "Authorization: Bearer ${adminTokenA}"`,
    AIEmployeeListResponseSchema
  );

  // 7. Get Details Body
  await testAndValidateBody(
    'GET /api/ai-employees/:id (200 Details Body)',
    `curl -s -X GET "${baseUrl}/api/ai-employees/${createdEmployeeId}" -H "Authorization: Bearer ${adminTokenA}"`,
    AIEmployeeResponseSchema
  );

  // 8. Patch Body
  await testAndValidateBody(
    'PATCH /api/ai-employees/:id (200 Patch Body)',
    `curl -s -X PATCH "${baseUrl}/api/ai-employees/${createdEmployeeId}" -H "Authorization: Bearer ${adminTokenA}" -H "Content-Type: application/json" -d '{"description":"Updated discover specialist"}'`,
    AIEmployeeResponseSchema
  );

  // 9. Activate Status Body
  await testAndValidateBody(
    'POST /api/ai-employees/:id/activate (200 Activate Body)',
    `curl -s -X POST "${baseUrl}/api/ai-employees/${createdEmployeeId}/activate" -H "Authorization: Bearer ${adminTokenA}"`,
    AIEmployeeResponseSchema
  );

  // 10. Pause Status Body
  await testAndValidateBody(
    'POST /api/ai-employees/:id/pause (200 Pause Body)',
    `curl -s -X POST "${baseUrl}/api/ai-employees/${createdEmployeeId}/pause" -H "Authorization: Bearer ${adminTokenA}"`,
    AIEmployeeResponseSchema
  );

  // 11. Inactive Employee Error Body
  await testAndValidateBody(
    'POST /api/ai-employees/:id/execute (400 EMPLOYEE_INACTIVE Error Body)',
    `curl -s -X POST "${baseUrl}/api/ai-employees/${createdEmployeeId}/execute" -H "Authorization: Bearer ${adminTokenA}" -H "Content-Type: application/json" -d '{"prompt":"Hello"}'`,
    ErrorResponseSchema
  );

  // Reactivate
  await testAndValidateBody(
    'POST /api/ai-employees/:id/activate (Reactivate Body)',
    `curl -s -X POST "${baseUrl}/api/ai-employees/${createdEmployeeId}/activate" -H "Authorization: Bearer ${adminTokenA}"`,
    AIEmployeeResponseSchema
  );

  // 12. Execution Reasoning Body
  await testAndValidateBody(
    'POST /api/ai-employees/:id/execute (200 Execute Reasoning Turn Body)',
    `curl -s -X POST "${baseUrl}/api/ai-employees/${createdEmployeeId}/execute" -H "Authorization: Bearer ${adminTokenA}" -H "Content-Type: application/json" -d '{"prompt":"Can you qualify a 500-seat enterprise lead?","maxTurns":1}'`,
    AIExecutionResponseSchema
  );

  // 13. Execution History Body
  await testAndValidateBody(
    'GET /api/ai-employees/:id/executions (200 Execution History List Body)',
    `curl -s -X GET "${baseUrl}/api/ai-employees/${createdEmployeeId}/executions" -H "Authorization: Bearer ${adminTokenA}"`,
    AIExecutionListResponseSchema
  );

  // 14. Cross-Tenant IDOR Read Error Body (404)
  await testAndValidateBody(
    'GET /api/ai-employees/:id (404 Cross-Tenant Read Error Body)',
    `curl -s -X GET "${baseUrl}/api/ai-employees/${createdEmployeeId}" -H "Authorization: Bearer ${adminTokenB}"`,
    ErrorResponseSchema
  );

  // 15. Cross-Tenant IDOR Execute Error Body (404)
  await testAndValidateBody(
    'POST /api/ai-employees/:id/execute (404 Cross-Tenant Execute Error Body)',
    `curl -s -X POST "${baseUrl}/api/ai-employees/${createdEmployeeId}/execute" -H "Authorization: Bearer ${adminTokenB}" -H "Content-Type: application/json" -d '{"prompt":"Cross tenant exploit"}'`,
    ErrorResponseSchema
  );

  // 16. Archive Body
  await testAndValidateBody(
    'POST /api/ai-employees/:id/archive (200 Archive Body)',
    `curl -s -X POST "${baseUrl}/api/ai-employees/${createdEmployeeId}/archive" -H "Authorization: Bearer ${adminTokenA}"`,
    AIEmployeeResponseSchema
  );

  await app.close();

  console.log('================================================================');
  console.log(`🏆 ALL ${validatedCount}/${validatedCount} BODY RESPONSES VALIDATED & CONFORM TO STRICT SCHEMAS`);
  console.log('================================================================');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
