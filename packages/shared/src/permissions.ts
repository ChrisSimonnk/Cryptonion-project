import { Role } from './enums';

export enum Permission {
  // Organization
  ORG_READ = 'org:read',
  ORG_UPDATE = 'org:update',
  ORG_DELETE = 'org:delete',

  // Membership & Invitations
  MEMBER_READ = 'member:read',
  MEMBER_CREATE = 'member:create',
  MEMBER_UPDATE = 'member:update',
  MEMBER_REMOVE = 'member:remove',

  // AI Employees
  EMPLOYEE_READ = 'employee:read',
  EMPLOYEE_CREATE = 'employee:create',
  EMPLOYEE_UPDATE = 'employee:update',
  EMPLOYEE_DELETE = 'employee:delete',

  // Campaigns
  CAMPAIGN_READ = 'campaign:read',
  CAMPAIGN_CREATE = 'campaign:create',
  CAMPAIGN_UPDATE = 'campaign:update',
  CAMPAIGN_DELETE = 'campaign:delete',

  // Leads
  LEAD_READ = 'lead:read',
  LEAD_CREATE = 'lead:create',
  LEAD_UPDATE = 'lead:update',
  LEAD_DELETE = 'lead:delete',

  // Calls & Telephony
  CALL_READ = 'call:read',
  CALL_INITIATE = 'call:initiate',
  CALL_TERMINATE = 'call:terminate',

  // Memory & Context Engine (Phase 4)
  MEMORY_READ = 'memory:read',
  MEMORY_CREATE = 'memory:create',
  MEMORY_UPDATE = 'memory:update',
  MEMORY_DELETE = 'memory:delete',

  // Conversations & Chat (Phase 4)
  CONVERSATION_READ = 'conversation:read',
  CONVERSATION_CREATE = 'conversation:create',

  // Knowledge & Documents
  KNOWLEDGE_READ = 'knowledge:read',
  KNOWLEDGE_CREATE = 'knowledge:create',
  KNOWLEDGE_UPDATE = 'knowledge:update',
  KNOWLEDGE_DELETE = 'knowledge:delete',

  // Security & Audit
  AUDIT_READ = 'audit:read',
}

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.SUPER_ADMIN]: Object.values(Permission),
  [Role.ADMIN]: [
    Permission.ORG_READ,
    Permission.ORG_UPDATE,
    Permission.MEMBER_READ,
    Permission.MEMBER_CREATE,
    Permission.MEMBER_UPDATE,
    Permission.MEMBER_REMOVE,
    Permission.EMPLOYEE_READ,
    Permission.EMPLOYEE_CREATE,
    Permission.EMPLOYEE_UPDATE,
    Permission.EMPLOYEE_DELETE,
    Permission.CAMPAIGN_READ,
    Permission.CAMPAIGN_CREATE,
    Permission.CAMPAIGN_UPDATE,
    Permission.CAMPAIGN_DELETE,
    Permission.LEAD_READ,
    Permission.LEAD_CREATE,
    Permission.LEAD_UPDATE,
    Permission.LEAD_DELETE,
    Permission.CALL_READ,
    Permission.CALL_INITIATE,
    Permission.CALL_TERMINATE,
    Permission.MEMORY_READ,
    Permission.MEMORY_CREATE,
    Permission.MEMORY_UPDATE,
    Permission.MEMORY_DELETE,
    Permission.CONVERSATION_READ,
    Permission.CONVERSATION_CREATE,
    Permission.KNOWLEDGE_READ,
    Permission.KNOWLEDGE_CREATE,
    Permission.KNOWLEDGE_UPDATE,
    Permission.KNOWLEDGE_DELETE,
    Permission.AUDIT_READ,
  ],
  [Role.MANAGER]: [
    Permission.ORG_READ,
    Permission.MEMBER_READ,
    Permission.EMPLOYEE_READ,
    Permission.EMPLOYEE_CREATE,
    Permission.EMPLOYEE_UPDATE,
    Permission.CAMPAIGN_READ,
    Permission.CAMPAIGN_CREATE,
    Permission.CAMPAIGN_UPDATE,
    Permission.LEAD_READ,
    Permission.LEAD_CREATE,
    Permission.LEAD_UPDATE,
    Permission.CALL_READ,
    Permission.CALL_INITIATE,
    Permission.CALL_TERMINATE,
    Permission.MEMORY_READ,
    Permission.MEMORY_CREATE,
    Permission.MEMORY_UPDATE,
    Permission.MEMORY_DELETE,
    Permission.CONVERSATION_READ,
    Permission.CONVERSATION_CREATE,
    Permission.KNOWLEDGE_READ,
    Permission.KNOWLEDGE_CREATE,
    Permission.KNOWLEDGE_UPDATE,
    Permission.AUDIT_READ,
  ],
  [Role.AGENT]: [
    Permission.ORG_READ,
    Permission.MEMBER_READ,
    Permission.EMPLOYEE_READ,
    Permission.CAMPAIGN_READ,
    Permission.LEAD_READ,
    Permission.LEAD_CREATE,
    Permission.LEAD_UPDATE,
    Permission.CALL_READ,
    Permission.CALL_INITIATE,
    Permission.MEMORY_READ,
    Permission.MEMORY_CREATE,
    Permission.MEMORY_UPDATE,
    Permission.CONVERSATION_READ,
    Permission.CONVERSATION_CREATE,
    Permission.KNOWLEDGE_READ,
  ],
  [Role.VIEWER]: [
    Permission.ORG_READ,
    Permission.MEMBER_READ,
    Permission.EMPLOYEE_READ,
    Permission.CAMPAIGN_READ,
    Permission.LEAD_READ,
    Permission.CALL_READ,
    Permission.MEMORY_READ,
    Permission.CONVERSATION_READ,
    Permission.KNOWLEDGE_READ,
  ],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}
