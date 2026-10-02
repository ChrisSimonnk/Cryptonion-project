# Cryptonion Identity, RBAC & Multi-Tenancy Architecture (Phase 2)

---

## 1. Overview & Core Philosophy

Cryptonion employs a strict, server-validated multi-tenant identity hierarchy:

```
                  USER
                   │
                   ▼
         MEMBERSHIP (Tenant Bind)
        ┌──────────┴──────────┐
        ▼                     ▼
   ORGANIZATION              ROLE
   (Workspace)        (SUPER_ADMIN, ADMIN,
        │              MANAGER, AGENT, VIEWER)
        │                     │
        │                     ▼
        │                PERMISSIONS
        │             (Granular Keys)
        ▼                     │
 ┌────────────────────────────┴────────────────────────────┐
 │                  TENANT-SCOPED RESOURCES                │
 │ AI Employees • Campaigns • Leads • Calls • Knowledge    │
 └─────────────────────────────────────────────────────────┘
```

---

## 2. Canonical Identity Models

### 2.1 User
- **Entity**: `users`
- **Fields**: `id` (UUID), `email` (unique, lowercase), `passwordHash` (bcrypt), `name`, `avatarUrl`, `isActive`, `lastLoginAt`, `createdAt`, `updatedAt`.
- **Invariants**: Unique email; passwords never stored or returned in plaintext.

### 2.2 Organization (Tenant)
- **Entity**: `organizations`
- **Fields**: `id` (UUID), `name`, `slug` (unique), `plan` (starter, growth, enterprise), `settings` (JSONB), `createdAt`, `updatedAt`.
- **Invariants**: All business assets must be strictly associated with an `organizationId`.

### 2.3 Membership
- **Entity**: `memberships`
- **Fields**: `id` (UUID), `userId` (FK users), `organizationId` (FK organizations), `role` (Enum Role), `status` (ACTIVE, SUSPENDED, INVITED), `invitedBy` (FK users), `createdAt`, `updatedAt`.
- **Invariants**: Unique compound index `(userId, organizationId)`.

### 2.4 Invitation
- **Entity**: `invitations`
- **Fields**: `id` (UUID), `organizationId` (FK), `email`, `role`, `token` (cryptographically secure hex, unique), `status` (PENDING, ACCEPTED, EXPIRED, REVOKED), `expiresAt`, `invitedById` (FK users), `createdAt`.
- **Invariants**: 7-day expiration; duplicate active invites per email/tenant rejected.

### 2.5 Audit Log
- **Entity**: `audit_logs`
- **Fields**: `id` (UUID), `organizationId` (nullable FK), `userId` (nullable FK), `action`, `resourceType`, `resourceId`, `details` (JSONB), `ipAddress`, `userAgent`, `createdAt`.
- **Purpose**: Immutable security audit trail for identity, authentication, role changes, and member removals.

---

## 3. Role & Centralized Permission System

Cryptonion uses centralized granular permissions mapped to roles via `ROLE_PERMISSIONS`:

| Permission Key | Description | SUPER_ADMIN | ADMIN | MANAGER | AGENT | VIEWER |
|---|---|:---:|:---:|:---:|:---:|:---:|
| `org:read` | View organization details | ✅ | ✅ | ✅ | ✅ | ✅ |
| `org:update` | Edit workspace name & settings | ✅ | ✅ | ❌ | ❌ | ❌ |
| `org:delete` | Delete organization | ✅ | ❌ | ❌ | ❌ | ❌ |
| `member:read` | List members & pending invites | ✅ | ✅ | ✅ | ✅ | ✅ |
| `member:create` | Invite new members | ✅ | ✅ | ❌ | ❌ | ❌ |
| `member:update` | Change member roles | ✅ | ✅ | ❌ | ❌ | ❌ |
| `member:remove` | Remove/deactivate member | ✅ | ✅ | ❌ | ❌ | ❌ |
| `employee:read` | View AI Employees | ✅ | ✅ | ✅ | ✅ | ✅ |
| `employee:create` | Create AI Employee | ✅ | ✅ | ✅ | ❌ | ❌ |
| `employee:update` | Update AI Employee | ✅ | ✅ | ✅ | ❌ | ❌ |
| `employee:delete` | Delete AI Employee | ✅ | ✅ | ❌ | ❌ | ❌ |
| `campaign:read` | View campaigns | ✅ | ✅ | ✅ | ✅ | ✅ |
| `campaign:create` | Create campaign | ✅ | ✅ | ✅ | ❌ | ❌ |
| `campaign:update` | Edit/Start campaign | ✅ | ✅ | ✅ | ❌ | ❌ |
| `lead:read` | View leads | ✅ | ✅ | ✅ | ✅ | ✅ |
| `lead:create` | Ingest / bulk import leads | ✅ | ✅ | ✅ | ✅ | ❌ |
| `lead:update` | Update lead status | ✅ | ✅ | ✅ | ✅ | ❌ |
| `call:read` | View call history & transcripts | ✅ | ✅ | ✅ | ✅ | ✅ |
| `call:initiate` | Dispatch outbound voice call | ✅ | ✅ | ✅ | ✅ | ❌ |
| `knowledge:read` | Query vector knowledge base | ✅ | ✅ | ✅ | ✅ | ✅ |
| `knowledge:create` | Create knowledge base / upload docs | ✅ | ✅ | ✅ | ❌ | ❌ |
| `audit:read` | View security & identity audit logs | ✅ | ✅ | ✅ | ❌ | ❌ |

---

## 4. Multi-Tenant Context & Organization Switching

### Request Context Resolution
Every authenticated HTTP or WebSocket request extracts:
```ts
request.user = {
  userId: string;
  email: string;
  organizationId: string;
  membershipId: string;
  role: Role;
}
```

### Context Switching (`POST /api/auth/switch-org`)
1. Client submits `{ organizationId: "target-uuid" }`.
2. Server verifies `Membership.findOne({ where: { userId, organizationId, status: ACTIVE } })`.
3. If valid, a new JWT is signed strictly bound to `target-uuid` with the user's specific role in that organization.
4. Security event `auth.switch_org` is logged.

---

## 5. Security Invariants & IDOR Protections

1. **Last-Owner Protection**: The system prevents demoting or removing the final `SUPER_ADMIN` of any organization.
2. **Self-Role Modification Guard**: Users cannot modify their own role.
3. **Escalation Prevention**: Non-owners cannot promote or invite members with `SUPER_ADMIN` role.
4. **Relational IDOR Enforcement**: Whenever child resources (`leadId`, `campaignId`, `aiEmployeeId`, `knowledgeBaseId`) are passed, handlers execute server-side checks:
   ```ts
   where: { id: entityId, organizationId: request.user.organizationId }
   ```
   Foreign entities belonging to another tenant return `404 Not Found` or `400 Bad Request`.
5. **Socket.IO Isolation**: Handshake authentication enforces JWT; room joins verify tenant membership.
