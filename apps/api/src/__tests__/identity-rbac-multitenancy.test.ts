import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../app';
import { FastifyInstance } from 'fastify';
import { Role, Permission, hasPermission, ROLE_PERMISSIONS } from '@cryptonion/shared';

describe('Phase 2: Identity, RBAC & Multi-Tenancy Architecture', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Centralized Role & Permission Engine', () => {
    it('grants all permissions to SUPER_ADMIN', () => {
      expect(hasPermission(Role.SUPER_ADMIN, Permission.ORG_UPDATE)).toBe(true);
      expect(hasPermission(Role.SUPER_ADMIN, Permission.MEMBER_REMOVE)).toBe(true);
      expect(hasPermission(Role.SUPER_ADMIN, Permission.AUDIT_READ)).toBe(true);
    });

    it('denies destructive and member management permissions to VIEWER', () => {
      expect(hasPermission(Role.VIEWER, Permission.MEMBER_CREATE)).toBe(false);
      expect(hasPermission(Role.VIEWER, Permission.MEMBER_REMOVE)).toBe(false);
      expect(hasPermission(Role.VIEWER, Permission.ORG_UPDATE)).toBe(false);
      expect(hasPermission(Role.VIEWER, Permission.EMPLOYEE_CREATE)).toBe(false);
      expect(hasPermission(Role.VIEWER, Permission.CALL_INITIATE)).toBe(false);
      expect(hasPermission(Role.VIEWER, Permission.CALL_READ)).toBe(true);
    });

    it('allows AGENT to initiate calls and create leads, but denies member management', () => {
      expect(hasPermission(Role.AGENT, Permission.CALL_INITIATE)).toBe(true);
      expect(hasPermission(Role.AGENT, Permission.LEAD_CREATE)).toBe(true);
      expect(hasPermission(Role.AGENT, Permission.MEMBER_CREATE)).toBe(false);
      expect(hasPermission(Role.AGENT, Permission.ORG_UPDATE)).toBe(false);
    });
  });

  describe('Multi-Tenant Context & RBAC Route Enforcement', () => {
    const orgA_Id = '11111111-1111-1111-1111-111111111111';
    const orgB_Id = '22222222-2222-2222-2222-222222222222';
    const userA_Id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

    it('blocks unauthenticated requests to organization endpoints with 401', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/organizations/current',
      });
      expect(res.statusCode).toBe(401);
    });

    it('enforces permission-based route guards for member management (403 for unauthorized roles)', async () => {
      // Token with AGENT role (lacks member:create permission)
      const agentToken = app.jwt.sign({
        userId: userA_Id,
        email: 'agent@org-a.com',
        organizationId: orgA_Id,
        membershipId: 'mem-1',
        role: Role.AGENT,
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/organizations/current/invitations',
        headers: { authorization: `Bearer ${agentToken}` },
        payload: {
          email: 'newbie@org-a.com',
          role: Role.VIEWER,
        },
      });

      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('FORBIDDEN');
      expect(body.error.message).toContain('member:create');
    });

    it('enforces permission-based route guards for audit logs (403 for VIEWER and AGENT)', async () => {
      const viewerToken = app.jwt.sign({
        userId: userA_Id,
        email: 'viewer@org-a.com',
        organizationId: orgA_Id,
        membershipId: 'mem-1',
        role: Role.VIEWER,
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/audit-logs',
        headers: { authorization: `Bearer ${viewerToken}` },
      });

      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.body);
      expect(body.error.code).toBe('FORBIDDEN');
      expect(body.error.message).toContain('audit:read');
    });
  });
});
