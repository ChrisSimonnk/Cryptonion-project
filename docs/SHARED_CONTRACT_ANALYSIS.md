# Cryptonion Shared Package Analysis & Boundary Classification

This document analyzes `packages/shared` in the Cryptonion codebase and classifies every major export into its proper architectural domain to establish clean repository boundaries.

---

## 1. Architectural Direction

The long-term decoupled architecture follows a single-direction dependency flow:

```text
cryptonion-platform (Fastify API)
       │
       │ (Defines and validates API contracts)
       ▼
API Contracts (DTOs, Enums, Zod Request/Response Schemas)
       │
       │ (Consumed by frontend client via HTTPS/WebSocket)
       ▼
cryptonion-console (Next.js Application)
```

`cryptonion-intelligence` (Python FastAPI) does **NOT** share TypeScript contracts directly; it communicates over a versioned JSON REST API contract (`POST /ai/agent/turn`).

No `cryptonion-shared` monorepo package is introduced during R1.

---

## 2. Export Classification Matrix

| Export Category | Specific Symbol | Classification | Intended Long-Term Home |
| :--- | :--- | :--- | :--- |
| **Enums** | `Role` | **API CONTRACT** | Generated OpenAPI / Client Types |
| | `MembershipStatus` | **API CONTRACT** | Generated OpenAPI / Client Types |
| | `InvitationStatus` | **API CONTRACT** | Generated OpenAPI / Client Types |
| | `EmployeeStatus` | **API CONTRACT** | Generated OpenAPI / Client Types |
| | `AIExecutionStatus`| **API CONTRACT** | Generated OpenAPI / Client Types |
| | `EmployeeRole` | **API CONTRACT** | Generated OpenAPI / Client Types |
| | `CallDirection` | **API CONTRACT** | Generated OpenAPI / Client Types |
| | `CallStatus` | **API CONTRACT** | Generated OpenAPI / Client Types |
| | `LeadStatus` | **API CONTRACT** | Generated OpenAPI / Client Types |
| | `CampaignStatus` | **API CONTRACT** | Generated OpenAPI / Client Types |
| | `MessageSender` | **API CONTRACT** | Generated OpenAPI / Client Types |
| | `MemoryType` | **API CONTRACT** | Generated OpenAPI / Client Types |
| | `MemorySource` | **API CONTRACT** | Generated OpenAPI / Client Types |
| | `KnowledgeStatus` | **API CONTRACT** | Generated OpenAPI / Client Types |
| | `DocumentStatus` | **API CONTRACT** | Generated OpenAPI / Client Types |
| **Permissions** | `Permission` (enum) | **API CONTRACT** | Shared Client/Server RBAC Definitions |
| | `ROLE_PERMISSIONS` | **PLATFORM IMPLEMENTATION** | `cryptonion-platform` RBAC Guard |
| | `hasPermission()` | **PLATFORM IMPLEMENTATION** | `cryptonion-platform` RBAC Service |
| **Types & DTOs** | `UserDTO` | **API CONTRACT** | REST Response Interface |
| | `OrganizationDTO` | **API CONTRACT** | REST Response Interface |
| | `MembershipDTO` | **API CONTRACT** | REST Response Interface |
| | `InvitationDTO` | **API CONTRACT** | REST Response Interface |
| | `AuditLogDTO` | **API CONTRACT** | REST Response Interface |
| | `AuthenticatedContextDTO` | **API CONTRACT** | Auth Session Response Interface |
| | `AIEmployeeVoiceConfig` | **API CONTRACT** | Entity Config Interface |
| | `AIEmployeeLLMConfig` | **API CONTRACT** | Entity Config Interface |
| | `AIEmployeeToolConfig`| **API CONTRACT** | Entity Config Interface |
| | `AIEmployeeDTO` | **API CONTRACT** | REST Response Interface |
| | `AIExecutionDTO` | **API CONTRACT** | REST Response Interface |
| | `LeadDTO` | **API CONTRACT** | REST Response Interface |
| | `CampaignDTO` | **API CONTRACT** | REST Response Interface |
| | `CallDTO` | **API CONTRACT** | REST Response Interface |
| | `MessageDTO` | **API CONTRACT** | REST Response Interface |
| | `KnowledgeBaseDTO` | **API CONTRACT** | REST Response Interface |
| | `ApiResponse<T>` | **API CONTRACT** | Standard JSON Wrapper |
| **Validation Schemas** | `UserRegisterSchema` | **API CONTRACT** | Request Validation (Platform + Console) |
| | `UserLoginSchema` | **API CONTRACT** | Request Validation (Platform + Console) |
| | `SwitchOrganizationSchema` | **API CONTRACT** | Request Validation |
| | `OrganizationCreateSchema` | **API CONTRACT** | Request Validation |
| | `OrganizationUpdateSchema` | **API CONTRACT** | Request Validation |
| | `InviteMemberSchema` | **API CONTRACT** | Request Validation |
| | `ChangeMemberRoleSchema` | **API CONTRACT** | Request Validation |
| | `AcceptInvitationSchema` | **API CONTRACT** | Request Validation |
| | `AIEmployeeCreateSchema` | **API CONTRACT** | Request Validation |
| | `AIEmployeeUpdateSchema` | **API CONTRACT** | Request Validation |
| | `AIEmployeeExecuteSchema` | **API CONTRACT** | Request Validation |
| | `LeadCreateSchema` | **API CONTRACT** | Request Validation |
| | `CampaignCreateSchema` | **API CONTRACT** | Request Validation |
| | `CallInitiateSchema` | **API CONTRACT** | Request Validation |
| | `KnowledgeBaseCreateSchema` | **API CONTRACT** | Request Validation |
| | `SearchQuerySchema` | **API CONTRACT** | Request Validation |
| | `AIMemoryCreateSchema` | **API CONTRACT** | Request Validation |
| | `AIMemoryUpdateSchema` | **API CONTRACT** | Request Validation |
| | `ConversationCreateSchema` | **API CONTRACT** | Request Validation |
| | `ConversationMessageCreateSchema` | **API CONTRACT** | Request Validation |

---

## 3. Summary of Repository Responsibilities

- **`cryptonion-platform`**: Owns the authoritative schemas, DB models, RBAC rules (`ROLE_PERMISSIONS`), and REST endpoints.
- **`cryptonion-console`**: Consumes DTO contracts and client-side form validation schemas without holding database or backend implementation logic.
- **`cryptonion-intelligence`**: Independent Python environment; consumes and returns JSON over internal HTTP API (`/ai/agent/turn`).
