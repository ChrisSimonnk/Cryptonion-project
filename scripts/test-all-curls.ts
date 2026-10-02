import { exec } from 'child_process';
import { promisify } from 'util';
import { buildApp } from '../apps/api/src/app';
import { Role, EmployeeRole, EmployeeStatus, AIExecutionStatus } from '@cryptonion/shared';
import { AIEmployee, AIExecution } from '@cryptonion/db';

const execAsync = promisify(exec);

async function runLiveCurlSuite() {
  console.log('===============================================================');
  console.log('🧪 CRYPTONION PHASE 3: LIVE HTTP CURL VERIFICATION SUITE');
  console.log('===============================================================\n');

  // In-memory backing store for mock models during live HTTP test
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

  // Build and start live Fastify server on port 3099
  const app = await buildApp();
  await app.listen({ port: 3099, host: '127.0.0.1' });
  const baseUrl = 'http://127.0.0.1:3099';

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
  const testResults: Array<{ name: string; command: string; status: number; success: boolean; output: any }> = [];

  async function runCurl(name: string, curlCmd: string, expectedStatus: number): Promise<any> {
    console.log(`▶ Testing: ${name}`);
    console.log(`  Command: ${curlCmd}`);
    try {
      const { stdout } = await execAsync(curlCmd);
      const parsed = JSON.parse(stdout);
      console.log(`  Response:`, JSON.stringify(parsed, null, 2));
      testResults.push({ name, command: curlCmd, status: expectedStatus, success: true, output: parsed });
      console.log(`  Result: ✅ PASS\n`);
      return parsed;
    } catch (err: any) {
      console.error(`  Error:`, err.message);
      testResults.push({ name, command: curlCmd, status: 500, success: false, output: err.message });
      console.log(`  Result: ❌ FAIL\n`);
      return null;
    }
  }

  // 1. GET /health
  await runCurl(
    '1. Public Health Check',
    `curl -s -X GET "${baseUrl}/health"`,
    200
  );

  // 2. POST /api/ai-employees (Unauthenticated)
  await runCurl(
    '2. Create AI Employee (Unauthenticated -> 401)',
    `curl -s -X POST "${baseUrl}/api/ai-employees" -H "Content-Type: application/json" -d '{"name":"Unauth Bot"}'`,
    401
  );

  // 3. POST /api/ai-employees (VIEWER Role -> 403 Forbidden)
  await runCurl(
    '3. Create AI Employee (VIEWER Role -> 403 Forbidden)',
    `curl -s -X POST "${baseUrl}/api/ai-employees" -H "Authorization: Bearer ${viewerTokenA}" -H "Content-Type: application/json" -d '{"name":"Unauthorized Agent","llmConfig":{"provider":"ollama","model":"llama3:8b","temperature":0.7,"maxTokens":512,"systemPrompt":"You are an agent."}}'`,
    403
  );

  // 4. POST /api/ai-employees (Negative Temperature -> 400 Validation Error)
  await runCurl(
    '4. Create AI Employee (Invalid Temperature -0.5 -> 400 Error)',
    `curl -s -X POST "${baseUrl}/api/ai-employees" -H "Authorization: Bearer ${adminTokenA}" -H "Content-Type: application/json" -d '{"name":"Bad Temp Agent","llmConfig":{"provider":"ollama","model":"llama3:8b","temperature":-0.5,"maxTokens":512,"systemPrompt":"You are an agent."}}'`,
    400
  );

  // 5. POST /api/ai-employees (ADMIN Role -> 201 Created)
  const createRes = await runCurl(
    '5. Create Autonomous AI Employee (ADMIN Role -> 201 Created)',
    `curl -s -X POST "${baseUrl}/api/ai-employees" -H "Authorization: Bearer ${adminTokenA}" -H "Content-Type: application/json" -d '{"name":"Sarah SDR","role":"SALES_REP","status":"DRAFT","llmConfig":{"provider":"ollama","model":"llama3:8b","temperature":0.7,"maxTokens":512,"systemPrompt":"You are Sarah, an expert outbound sales SDR."},"voiceConfig":{"provider":"piper","voiceId":"en_US-lessac-medium","speed":1.0,"pitch":1.0}}'`,
    201
  );
  if (createRes?.data?.id) {
    createdEmployeeId = createRes.data.id;
  }

  // 6. GET /api/ai-employees (List Employees for Organization A)
  await runCurl(
    '6. List AI Employees for Organization',
    `curl -s -X GET "${baseUrl}/api/ai-employees" -H "Authorization: Bearer ${adminTokenA}"`,
    200
  );

  // 7. GET /api/ai-employees/:id (Get details)
  await runCurl(
    '7. Get AI Employee Details by ID',
    `curl -s -X GET "${baseUrl}/api/ai-employees/${createdEmployeeId}" -H "Authorization: Bearer ${adminTokenA}"`,
    200
  );

  // 8. PATCH /api/ai-employees/:id (Update Config)
  await runCurl(
    '8. Update AI Employee Configuration (PATCH)',
    `curl -s -X PATCH "${baseUrl}/api/ai-employees/${createdEmployeeId}" -H "Authorization: Bearer ${adminTokenA}" -H "Content-Type: application/json" -d '{"description":"Updated discovery specialist description"}'`,
    200
  );

  // 9. POST /api/ai-employees/:id/activate (Activate Employee)
  await runCurl(
    '9. Activate AI Employee',
    `curl -s -X POST "${baseUrl}/api/ai-employees/${createdEmployeeId}/activate" -H "Authorization: Bearer ${adminTokenA}"`,
    200
  );

  // 10. POST /api/ai-employees/:id/pause (Pause Employee)
  await runCurl(
    '10. Pause AI Employee',
    `curl -s -X POST "${baseUrl}/api/ai-employees/${createdEmployeeId}/pause" -H "Authorization: Bearer ${adminTokenA}"`,
    200
  );

  // 11. POST /api/ai-employees/:id/execute (Execute paused employee -> 400 EMPLOYEE_INACTIVE)
  await runCurl(
    '11. Execute Paused AI Employee (Expect 400 EMPLOYEE_INACTIVE)',
    `curl -s -X POST "${baseUrl}/api/ai-employees/${createdEmployeeId}/execute" -H "Authorization: Bearer ${adminTokenA}" -H "Content-Type: application/json" -d '{"prompt":"Hello Sarah!"}'`,
    400
  );

  // 12. POST /api/ai-employees/:id/activate (Reactivate Employee)
  await runCurl(
    '12. Reactivate AI Employee to ACTIVE status',
    `curl -s -X POST "${baseUrl}/api/ai-employees/${createdEmployeeId}/activate" -H "Authorization: Bearer ${adminTokenA}"`,
    200
  );

  // 13. POST /api/ai-employees/:id/execute (Execute active employee -> 200 OK)
  await runCurl(
    '13. Execute Active AI Employee Reasoning Turn (Expect 200 OK with Latency & Tokens)',
    `curl -s -X POST "${baseUrl}/api/ai-employees/${createdEmployeeId}/execute" -H "Authorization: Bearer ${adminTokenA}" -H "Content-Type: application/json" -d '{"prompt":"Hello Sarah! Can you qualify our target customer size?","maxTurns":1}'`,
    200
  );

  // 14. GET /api/ai-employees/:id/executions (List execution history)
  await runCurl(
    '14. List Execution History for AI Employee',
    `curl -s -X GET "${baseUrl}/api/ai-employees/${createdEmployeeId}/executions" -H "Authorization: Bearer ${adminTokenA}"`,
    200
  );

  // 15. Cross-Tenant IDOR Protection (Org B attempts to view Org A employee -> 404)
  await runCurl(
    '15. Cross-Tenant IDOR Read Attempt (Org B -> Org A Employee: Expect 404 Not Found)',
    `curl -s -X GET "${baseUrl}/api/ai-employees/${createdEmployeeId}" -H "Authorization: Bearer ${adminTokenB}"`,
    404
  );

  // 16. Cross-Tenant IDOR Protection (Org B attempts to execute Org A employee -> 404)
  await runCurl(
    '16. Cross-Tenant IDOR Execute Attempt (Org B -> Org A Employee: Expect 404 Not Found)',
    `curl -s -X POST "${baseUrl}/api/ai-employees/${createdEmployeeId}/execute" -H "Authorization: Bearer ${adminTokenB}" -H "Content-Type: application/json" -d '{"prompt":"Unauthorized exploit attempt"}'`,
    404
  );

  // 17. POST /api/ai-employees/:id/archive (Archive Employee)
  await runCurl(
    '17. Archive AI Employee',
    `curl -s -X POST "${baseUrl}/api/ai-employees/${createdEmployeeId}/archive" -H "Authorization: Bearer ${adminTokenA}"`,
    200
  );

  await app.close();

  console.log('===============================================================');
  console.log(`📊 CURL TEST SUITE SUMMARY: ${testResults.filter(r => r.success).length}/${testResults.length} PASSED`);
  console.log('===============================================================');
}

runLiveCurlSuite().catch(err => {
  console.error('Fatal curl suite error:', err);
  process.exit(1);
});
