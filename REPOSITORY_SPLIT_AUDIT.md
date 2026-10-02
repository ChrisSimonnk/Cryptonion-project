# CRYPTONION — 3-REPOSITORY ARCHITECTURE SPLIT AUDIT

**Role**: Principal Software Architect + Senior Repository Migration Engineer  
**Document**: `REPOSITORY_SPLIT_AUDIT.md`  
**Phase**: Phase 0 — Comprehensive Pre-Migration Read-Only Audit  
**Status**: AUDIT COMPLETE — AWAITING EXPLICIT APPROVAL (DO NOT CREATE REPOSITORIES YET)

---

## 1. Current Monorepo Structure

```text
CURRENT MONOREPO (/Users/mac1/Personal_libaray_Goal)
├── .env / .env.example                     # Unified environment variables for all 4 services
├── package.json / package-lock.json        # Root npm workspaces configuration
├── vitest.config.mts                       # Root Vitest runner configuration
├── README.md                               # Project documentation
│
├── apps/
│   ├── web/                                # Next.js 14.2.4 Frontend Dashboard
│   │   ├── app/
│   │   │   ├── page.tsx                    # Landing / Auth entry page
│   │   │   ├── layout.tsx / globals.css    # Root HTML & styling tokens
│   │   │   └── dashboard/
│   │   │       ├── page.tsx                # Dashboard metrics & live calls view
│   │   │       ├── layout.tsx              # Sidebar navigation & tenant profile
│   │   │       ├── calls/page.tsx          # Real-time telephony logs & recordings
│   │   │       ├── campaigns/page.tsx      # Outbound campaigns & lead triggers
│   │   │       ├── employees/page.tsx      # AI Employee console & interactive chat
│   │   │       ├── knowledge/page.tsx      # Knowledge base & document management
│   │   │       └── organization/page.tsx   # Multi-tenant settings, team, RBAC
│   │   ├── lib/
│   │   │   ├── api.ts                      # Client-side fetch wrapper (/api proxy)
│   │   │   └── store.ts                    # Zustand auth store (token, user, org, perms)
│   │   ├── next.config.js                  # Next.js config with /api & /socket.io rewrites
│   │   ├── tailwind.config.ts              # Tailwind CSS design system
│   │   └── package.json                    # Depends on @cryptonion/shared, @cryptonion/tsconfig
│   │
│   ├── api/                                # Fastify 4.28 Backend Platform Server
│   │   ├── src/
│   │   │   ├── server.ts                   # Entry point (port 3001)
│   │   │   ├── app.ts                      # Fastify plugin & route registry
│   │   │   ├── config/env.ts               # Env loader & configuration objects
│   │   │   ├── plugins/
│   │   │   │   ├── auth.ts                 # JWT, RBAC guards (requirePermission)
│   │   │   │   ├── socket.ts               # Socket.IO authenticated tenant namespace
│   │   │   │   └── swagger.ts              # OpenAPI Swagger documentation generator
│   │   │   ├── services/
│   │   │   │   └── queue.service.ts        # BullMQ queue dispatcher (ai-queue)
│   │   │   ├── modules/
│   │   │   │   ├── health/                 # GET /health
│   │   │   │   ├── auth/                   # POST /api/auth/login, register, switch-org
│   │   │   │   ├── organizations/          # Org, member, invitation endpoints
│   │   │   │   ├── ai-employees/           # AI Employee CRUD & manual execution
│   │   │   │   ├── leads/                  # Lead management
│   │   │   │   ├── campaigns/              # Campaign scheduling
│   │   │   │   ├── calls/                  # Call tracking & SIP dispatch
│   │   │   │   ├── knowledge/              # Knowledge bases, parsers, chunking, embeddings
│   │   │   │   │   ├── parsers/            # TXT, Markdown, PDF, DOCX parsers
│   │   │   │   │   ├── embeddings/         # Ollama, OpenAI, EmbeddingService
│   │   │   │   │   ├── normalization.ts    # Unicode text normalizer
│   │   │   │   │   ├── checksum.ts         # SHA-256 calculator
│   │   │   │   │   └── chunking.ts         # Semantic deterministic chunker
│   │   │   │   ├── memory/                 # Long-term semantic memories CRUD & search
│   │   │   │   ├── context/                # ContextBuilder (injects system + memory)
│   │   │   │   └── conversations/          # Chat sessions, messages, AI turn execution
│   │   │   └── __tests__/                  # 11 Vitest test suites (104 unit/matrix tests)
│   │   └── package.json                    # Depends on @cryptonion/db, @cryptonion/shared
│   │
│   ├── worker/                             # BullMQ 5.8 Background Workers
│   │   ├── src/
│   │   │   ├── index.ts                    # Worker bootstrap
│   │   │   ├── queues/index.ts             # Redis connection & BullMQ queues
│   │   │   ├── workers/
│   │   │   │   ├── ai.worker.ts            # ai-queue consumer (execute-ai, memory-extract)
│   │   │   │   └── call.worker.ts          # call-queue consumer (outbound calls)
│   │   │   └── __tests__/                  # 2 Vitest test suites (5 worker tests)
│   │   └── package.json                    # Depends on @cryptonion/db, @cryptonion/shared
│   │
│   └── ai/                                 # FastAPI Python 3 AI/ML Microservice
│       ├── app/
│       │   ├── main.py                     # FastAPI entry point (port 8000)
│       │   ├── core/config.py              # Python Pydantic settings
│       │   ├── agents/engine.py            # AgentEngine execution loop
│       │   ├── llm/provider.py             # BaseLLMProvider, Ollama, OpenAI, Anthropic
│       │   ├── rag/retriever.py            # Vector similarity search retriever
│       │   ├── stt/whisper.py              # Faster-Whisper audio transcription
│       │   └── tts/piper.py                # Piper low-latency TTS synthesizer
│       └── requirements.txt                # FastAPI, uvicorn, pydantic, httpx, pgvector
│
├── packages/
│   ├── shared/                             # Universal TypeScript types, enums, schemas
│   │   ├── src/
│   │   │   ├── enums.ts                    # Role, Permission, Status enums
│   │   │   ├── permissions.ts              # RBAC role-permission matrix
│   │   │   ├── types.ts                    # DTO interfaces (UserDTO, OrgDTO, etc.)
│   │   │   ├── schemas.ts                  # Zod validation schemas
│   │   │   └── __tests__/                  # Schema validation test suite (7 tests)
│   │   └── package.json
│   │
│   ├── db/                                 # Sequelize ORM & PostgreSQL Models
│   │   ├── src/
│   │   │   ├── client.ts                   # Sequelize client & pg connection
│   │   │   ├── index.ts                    # Model association setup & HNSW vector index
│   │   │   ├── models/                     # 16 Sequelize Models (User, Org, AIEmployee, etc.)
│   │   │   ├── migrations/                 # 5 Versioned database migrations
│   │   │   └── __tests__/                  # 6 Vitest test suites (13 model & migration tests)
│   │   └── package.json                    # Depends on @cryptonion/shared
│   │
│   └── tsconfig/                           # Base tsconfig files
│       ├── base.json
│       ├── nextjs.json
│       └── package.json
│
├── docker/
│   ├── docker-compose.yml                  # PostgreSQL (pgvector), Redis, MinIO, Ollama, Caddy
│   ├── init-pgvector.sql                   # CREATE EXTENSION IF NOT EXISTS vector;
│   └── Caddyfile                           # Reverse proxy configuration
│
└── docs/
    └── identity-rbac-multitenancy.md       # Architecture specification
```

---

## 2. Target 3-Repository Architecture

```text
Repository 1: cryptonion-console
Repository 2: cryptonion-platform
Repository 3: cryptonion-intelligence
```

### Detailed Target Structures

#### Repository 1: `cryptonion-console` (Next.js Application)
```text
cryptonion-console/
├── .env.example                            # NEXT_PUBLIC_API_URL, NEXT_PUBLIC_WS_URL
├── .gitignore
├── README.md
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.ts
├── postcss.config.js
├── app/
│   ├── layout.tsx / globals.css
│   ├── page.tsx
│   └── dashboard/
│       ├── layout.tsx
│       ├── page.tsx
│       ├── calls/page.tsx
│       ├── campaigns/page.tsx
│       ├── employees/page.tsx
│       ├── knowledge/page.tsx
│       └── organization/page.tsx
├── lib/
│   ├── api/                                # Clean Typed API Client (contracts-based)
│   │   ├── client.ts
│   │   ├── auth.ts
│   │   ├── employees.ts
│   │   └── knowledge.ts
│   ├── store.ts                            # Client Zustand Store
│   └── types/                              # Frontend DTO contracts & view models
└── tests/                                  # Frontend UI / component / store tests
```

#### Repository 2: `cryptonion-platform` (Fastify API + BullMQ Worker + PostgreSQL + DB Migrations)
```text
cryptonion-platform/
├── .env.example                            # DATABASE_URL, REDIS_URL, JWT_SECRET, AI_SERVICE_URL
├── .gitignore
├── README.md
├── package.json                            # npm workspaces: apps/*, packages/*
├── vitest.config.mts
├── apps/
│   ├── api/                                # Fastify API (Auth, RBAC, CRUD, Socket.IO)
│   │   ├── src/
│   │   └── package.json
│   └── worker/                             # BullMQ background workers (AI, Calls, Docs)
│       ├── src/
│       └── package.json
├── packages/
│   ├── db/                                 # 16 Sequelize models + 5 migrations + client
│   │   ├── src/
│   │   └── package.json
│   ├── shared/                             # Platform-owned contracts, enums, schemas, DTOs
│   │   ├── src/
│   │   └── package.json
│   └── tsconfig/                           # Shared TS compiler configs
├── docker/
│   ├── docker-compose.yml                  # PostgreSQL (pgvector), Redis, MinIO
│   └── init-pgvector.sql
└── tests/                                  # Integration & Regression Test Suites
```

#### Repository 3: `cryptonion-intelligence` (FastAPI Python AI/ML Engine)
```text
cryptonion-intelligence/
├── .env.example                            # OLLAMA_BASE_URL, OPENAI_API_KEY, ANTHROPIC_API_KEY
├── .gitignore
├── README.md
├── requirements.txt
├── pyproject.toml
├── Dockerfile
├── app/
│   ├── __init__.py
│   ├── main.py                             # FastAPI entry point
│   ├── core/                               # Settings, logging, lifecycle
│   │   ├── __init__.py
│   │   └── config.py
│   ├── api/                                # API route handlers
│   │   ├── __init__.py
│   │   ├── agent.py                        # POST /ai/agent/turn
│   │   ├── tts.py                          # POST /ai/tts/synthesize
│   │   └── health.py                       # GET /ai/health, /health
│   ├── engine/                             # Core AgentEngine
│   │   ├── __init__.py
│   │   └── agent_engine.py
│   ├── llm/                                # LLM Provider Abstractions
│   │   ├── __init__.py
│   │   ├── base.py
│   │   ├── ollama.py
│   │   ├── openai.py
│   │   └── anthropic.py
│   ├── speech/                             # STT & TTS implementations
│   │   ├── __init__.py
│   │   ├── whisper.py
│   │   └── piper.py
│   └── rag/                                # Vector similarity & context retrieval
│       ├── __init__.py
│       └── retriever.py
└── tests/                                  # pytest test suites
```

---

## 3. File Migration Matrix

| Current Path | Target Repository | Target Path | Reason / Architectural Justification |
| :--- | :--- | :--- | :--- |
| `apps/web/*` | `cryptonion-console` | `/*` (root of console repo) | Frontend application and UI components. Promoted to root for standard Next.js deployment. |
| `apps/web/lib/api.ts` | `cryptonion-console` | `lib/api/client.ts` | Public HTTP API client communicating with `cryptonion-platform`. |
| `apps/web/lib/store.ts` | `cryptonion-console` | `lib/store.ts` | Client state management (Zustand). |
| `apps/api/*` | `cryptonion-platform` | `apps/api/*` | Core Fastify REST API, authentication, RBAC, domain routing. |
| `apps/worker/*` | `cryptonion-platform` | `apps/worker/*` | BullMQ background workers sharing models, queue definitions, and DB with API. |
| `packages/db/*` | `cryptonion-platform` | `packages/db/*` | PostgreSQL Sequelize models, client, HNSW vector index, migrations. |
| `packages/shared/*` | `cryptonion-platform` | `packages/shared/*` | Backend system-of-record schemas, enums, permissions, and DTOs. |
| `packages/tsconfig/*` | `cryptonion-platform` | `packages/tsconfig/*` | Node/TS compiler configs. |
| `apps/ai/*` | `cryptonion-intelligence` | `/*` (root of intelligence repo) | Python FastAPI AI service, LLM providers, Speech, RAG engine. Promoted to root. |
| `docker/docker-compose.yml` | `cryptonion-platform` | `docker/docker-compose.yml` | Platform infrastructure: Postgres, Redis, MinIO. |
| `docker/init-pgvector.sql` | `cryptonion-platform` | `docker/init-pgvector.sql` | Database pgvector initialization script. |
| `docker/Caddyfile` | `cryptonion-platform` | `docker/Caddyfile` | Edge proxy configuration. |
| `scripts/*` | `cryptonion-platform` | `scripts/*` | Integration curl and response testing harnesses. |
| `docs/identity-rbac-multitenancy.md`| `cryptonion-platform` | `docs/identity-rbac-multitenancy.md` | Core security & architecture specification. |
| `vitest.config.mts` | `cryptonion-platform` | `vitest.config.mts` | Platform test configuration. |

---

## 4. Dependency Matrix

| Source Repository | Dependency | Target Repository | Communication Mechanism | Boundary Guarantee |
| :--- | :--- | :--- | :--- | :--- |
| `cryptonion-console` | Platform API | `cryptonion-platform` | HTTPS REST (`/api/*`) + WSS (`/socket.io`) | Console NEVER connects to PostgreSQL, Redis, or BullMQ directly. |
| `cryptonion-platform` | Intelligence API | `cryptonion-intelligence`| Internal HTTP REST (`/ai/agent/turn`, `/ai/tts/synthesize`) | Platform initiates stateless request; Intelligence NEVER accesses DB schema directly. |
| `cryptonion-console` | Shared Types/DTOs | `cryptonion-console` | Independent Frontend DTO Contract (`lib/types/*`) | Replaces monorepo package import `@cryptonion/shared` to avoid monorepo coupling. |
| `cryptonion-platform` | Database / Redis | External Infrastructure | TCP `localhost:5432` / `localhost:6379` | Platform owns database schemas and queue dispatching. |
| `cryptonion-intelligence`| LLM / Ollama | External Daemon | HTTP `localhost:11434` / Cloud APIs | Intelligence encapsulates all raw AI provider interactions. |

---

## 5. Cross-Repository Imports to Break & Decouple

The audit identified **4 key cross-boundary import couplings** that must be restructured:

### 1. `apps/web/lib/store.ts`
- **Current**:
  ```ts
  import { UserDTO, OrganizationDTO, Role, Permission, AuthenticatedContextDTO } from '@cryptonion/shared';
  ```
- **Resolution in Console**: Replace with decoupled client contract types inside `cryptonion-console/lib/types/auth.ts`. The console only requires the shape of the JSON payloads returned by `/api/auth/me` and `/api/auth/login`.

### 2. `apps/web/app/dashboard/employees/page.tsx`
- **Current**:
  ```ts
  import { AIEmployeeDTO, EmployeeRole, EmployeeStatus, MemoryType, MemorySource } from '@cryptonion/shared';
  ```
- **Resolution in Console**: Replace with frontend view-model interfaces in `cryptonion-console/lib/types/employee.ts`.

### 3. `apps/web/app/dashboard/organization/page.tsx`
- **Current**:
  ```ts
  import { Role } from '@cryptonion/shared';
  ```
- **Resolution in Console**: Replaced by client enum/union type `'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'AGENT' | 'VIEWER'`.

### 4. `apps/ai/app/core/config.py`
- **Current**:
  ```python
  load_dotenv(os.path.join(os.path.dirname(__file__), "../../../.env"))
  ```
- **Resolution in Intelligence**: Relative path reaching 3 directories up to monorepo root is replaced with local `.env` loading:
  ```python
  load_dotenv(os.path.join(os.path.dirname(__file__), "../../.env"))
  ```

---

## 6. Environment Variable Matrix

| Variable | Current Owner | New Owner Repository | Secret? | Description |
| :--- | :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | Monorepo | `cryptonion-console` | **NO** | Base URL for Platform Fastify API (e.g. `http://localhost:3001`) |
| `NEXT_PUBLIC_WS_URL` | Monorepo | `cryptonion-console` | **NO** | WebSocket URL for Socket.IO notifications |
| `NODE_ENV` | Monorepo | ALL Repositories | **NO** | Runtime environment (`development`, `production`, `test`) |
| `API_PORT` / `API_HOST` | Monorepo | `cryptonion-platform` | **NO** | Port and bind host for Fastify API |
| `JWT_SECRET` | Monorepo | `cryptonion-platform` | **YES** | Cryptographic key for signing user auth tokens |
| `SESSION_SECRET` | Monorepo | `cryptonion-platform` | **YES** | Cookie session secret |
| `ENCRYPTION_KEY` | Monorepo | `cryptonion-platform` | **YES** | AES key for encrypting provider keys/tokens |
| `DATABASE_URL` | Monorepo | `cryptonion-platform` | **YES** | PostgreSQL connection string |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | Monorepo | `cryptonion-platform` | **YES** | Postgres credentials for Sequelize migrations & client |
| `REDIS_URL` | Monorepo | `cryptonion-platform` | **YES** | Redis connection URL for BullMQ queues |
| `AI_SERVICE_URL` | Monorepo | `cryptonion-platform` | **NO** | Internal URL for `cryptonion-intelligence` (`http://localhost:8000`) |
| `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET` | Monorepo | `cryptonion-platform` | **YES** | MinIO object storage parameters |
| `ASTERISK_HOST`, `ASTERISK_AMI_PORT`, `ASTERISK_AMI_USER`, `ASTERISK_AMI_SECRET` | Monorepo | `cryptonion-platform` | **YES** | Asterisk telephony AMI credentials |
| `AI_SERVICE_PORT` / `AI_SERVICE_HOST` | Monorepo | `cryptonion-intelligence`| **NO** | Port and host for FastAPI server (`8000`, `0.0.0.0`) |
| `OLLAMA_BASE_URL` | Monorepo | `cryptonion-intelligence`| **NO** | Ollama daemon URL (`http://localhost:11434`) |
| `DEFAULT_LLM_MODEL` | Monorepo | `cryptonion-intelligence`| **NO** | Default model identifier (`llama3:8b`) |
| `OPENAI_API_KEY` | Monorepo | `cryptonion-intelligence`| **YES** | OpenAI API key |
| `ANTHROPIC_API_KEY` | Monorepo | `cryptonion-intelligence`| **YES** | Anthropic API key |
| `STT_MODEL_SIZE` | Monorepo | `cryptonion-intelligence`| **NO** | Whisper model size (`base`) |
| `TTS_VOICE_MODEL` | Monorepo | `cryptonion-intelligence`| **NO** | Piper voice model (`en_US-lessac-medium`) |
| `LLM_TIMEOUT_SECONDS` | Monorepo | `cryptonion-intelligence`| **NO** | Outbound LLM HTTP timeout (`30.0`) |

---

## 7. Docker Infrastructure Matrix

| Service | Image / Technology | Target Owner Repository | Justification |
| :--- | :--- | :--- | :--- |
| `postgres` | `pgvector/pgvector:pg16` | `cryptonion-platform` | PostgreSQL is the system of record owned exclusively by Platform. |
| `redis` | `redis:7-alpine` | `cryptonion-platform` | BullMQ worker queues and cache are owned by Platform. |
| `minio` | `minio/minio:latest` | `cryptonion-platform` | Audio recording & document file object storage owned by Platform. |
| `caddy` | `caddy:2-alpine` | `cryptonion-platform` | Reverse proxy and local edge gateway owned by Platform. |
| `ollama` | `ollama/ollama:latest` | `cryptonion-intelligence` (or infra) | Host/container for local LLMs and embeddings. |

---

## 8. CI/CD Separation Impact

| Repository | Pipeline Triggers | Required Steps | Isolation Guarantee |
| :--- | :--- | :--- | :--- |
| **`cryptonion-console`** | PR / Push on `cryptonion-console` | `npm ci` ➔ `npm run lint` ➔ `npm run test` ➔ `npm run build` (`next build`) | **Zero Node-to-Python dependency.** Does not require Postgres, Redis, or Ollama. |
| **`cryptonion-platform`** | PR / Push on `cryptonion-platform` | `npm ci` ➔ `npm run lint` ➔ `npm test` ➔ DB migration check ➔ `npm run build` | Tests API, worker, DB models, migrations. Uses ephemeral Postgres+pgvector service container. |
| **`cryptonion-intelligence`** | PR / Push on `cryptonion-intelligence` | `pip install -r requirements.txt` ➔ `python3 -m py_compile` ➔ `pytest` ➔ Health check test | **Zero Node.js dependency.** Does not require Node, npm, or Sequelize. |

---

## 9. Risk Register

| Risk ID | Risk Description | Severity | Impact | Mitigation Strategy |
| :--- | :--- | :--- | :--- | :--- |
| **R-01** | Frontend type drift between Console DTOs and Platform API response shapes | **MEDIUM** | UI rendering errors or missing properties | Create explicit versioned DTO interfaces in `cryptonion-console/lib/types` aligned with Fastify Zod schemas. |
| **R-02** | Breaking working Next.js rewrite proxy (`/api/:path*` -> `localhost:3001`) | **MEDIUM** | Failed API requests in local development | Configure Next.js rewrites in `cryptonion-console` to read `NEXT_PUBLIC_API_URL` dynamically. |
| **R-03** | Loss of Git commit history during directory migration | **HIGH** | Loss of historical context & attribution | Use non-destructive migration technique (e.g. `git subtree` or clean branch filter) preserving source monorepo until all 3 repos verify 100%. |
| **R-04** | Accidental leakage of server secrets into Frontend Console repository | **CRITICAL** | Security exposure of database passwords or JWT keys | Strict `.gitignore` enforcement; audit all committed files in `cryptonion-console` for absence of `.env`, `DATABASE_URL`, `JWT_SECRET`. |
| **R-05** | Circular dependency or direct database access introduced into Intelligence | **HIGH** | Architectural violation; split failure | Strictly enforce that `cryptonion-intelligence` exposes REST endpoints and contains zero Sequelize/Postgres business logic. |
| **R-06** | Test suite regressions across Phase 1–5 | **CRITICAL** | Broken existing verified functionality | Run full 137-test suite in `cryptonion-platform` and verify all 20 test files pass with 0 failures before finalizing. |

---

## 10. Recommended Migration Sequence

To ensure **zero downtime**, **zero data loss**, and **zero functionality regression**, the migration must execute in the following 6 sequential phases:

```text
Step 0: Pre-Migration Baseline (Current Monorepo: 137/137 tests passing, all builds green) — [COMPLETE]
  ↓
Step 1: Create Repository Directories & Independent Git Inits
        - Initialize cryptonion-console
        - Initialize cryptonion-platform
        - Initialize cryptonion-intelligence
  ↓
Step 2: Migrate cryptonion-intelligence (Cleanest boundary: Python FastAPI)
        - Move apps/ai -> cryptonion-intelligence
        - Create local .env.example, Dockerfile, README
        - Verify python compilation, module imports, and FastAPI startup
  ↓
Step 3: Migrate cryptonion-console (Frontend boundary: Next.js)
        - Move apps/web -> cryptonion-console
        - Decouple @cryptonion/shared imports into local lib/types contracts
        - Configure local .env.example, next.config.js, README
        - Verify npm run build (next build) succeeds cleanly
  ↓
Step 4: Migrate cryptonion-platform (Backend system-of-record: Fastify + BullMQ + DB + Migrations)
        - Organize apps/api, apps/worker, packages/db, packages/shared, packages/tsconfig
        - Configure root package.json, vitest.config.mts, docker-compose.yml
        - Verify all 137 tests pass, migrations run cleanly, builds succeed
  ↓
Step 5: End-to-End Integration Verification & Final Sign-Off
        - Run Console (3000) ➔ Platform (3001) ➔ Intelligence (8000)
        - Verify full authentication, conversation, AI turn execution, and tenant isolation
```

---

## STOP GATE NOTICE

> [!IMPORTANT]
> In strict accordance with the prompt directives:
> - **PHASE 0 (READ-ONLY AUDIT) IS COMPLETE.**
> - **NO DIRECTORIES HAVE BEEN MOVED YET.**
> - **NO REPOSITORIES HAVE BEEN CREATED YET.**
> - Awaiting explicit user review and approval of `REPOSITORY_SPLIT_AUDIT.md` before initiating Step 1.
