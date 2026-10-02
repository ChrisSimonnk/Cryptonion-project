# Cryptonion — Autonomous AI Employee & Telephony Platform

Cryptonion is an open-source, self-hostable autonomous AI workforce platform. It features real-time outbound dialing, inbound reception, sub-300ms speech synthesis, pgvector RAG, and multi-tenant workspace management.

---

## 🏗 Architecture Overview

```
                    CRYPTONION
                         │
        ┌────────────────┼─────────────────┐
        │                │                 │
        ▼                ▼                 ▼
   Next.js 14        Fastify API       FastAPI AI
   React 18          TypeScript        Python 3.11+
        │                │                 │
        └──────────┬─────┴─────────┬───────┘
                   │               │
                   ▼               ▼
              PostgreSQL        MongoDB
              + pgvector        (optional)
                   │
                   ▼
                 Redis
                   │
              ┌────┴────┐
              ▼         ▼
           BullMQ     Workers
                        │
         ┌──────────────┼──────────────┐
         ▼              ▼              ▼
       Ollama       Whisper/STT       TTS
         │              │              │
         └──────────────┼──────────────┘
                        ▼
                 Asterisk/FreeSWITCH
                        │
                        ▼
                      Phone
```

---

## 📦 Stack Components

- **Frontend**: Next.js 14 App Router, React 18, Tailwind CSS, Lucide Icons, Zustand, React Hook Form, Zod.
- **Backend API**: Fastify 4, TypeScript, Zod, Swagger OpenAPI, Socket.IO, Sequelize ORM.
- **AI Service**: Python 3.11+, FastAPI, Pydantic v2, Ollama Provider, faster-whisper STT, Piper TTS, pgvector Semantic Retriever.
- **Background Workers**: BullMQ 5 + Redis 7 (Call dispatching, audio summarization, document embedding).
- **Data & Storage**: PostgreSQL 16 + `pgvector`, Redis 7, MinIO S3-compatible storage.
- **Infrastructure**: Docker Compose, Caddy Reverse Proxy.

---

## 🚀 Quick Start Guide

### 1. Start Infrastructure Containers
```bash
# Start PostgreSQL (pgvector), Redis, MinIO, Ollama, Caddy
npm run docker:up
```

### 2. Install Dependencies & Build Packages
```bash
npm install
npm run build --workspace=@cryptonion/shared
npm run build --workspace=@cryptonion/db
```

### 3. Start Backend Services
```bash
# Terminal 1: Fastify API Server (Port 3001)
npm run dev --workspace=@cryptonion/api

# Terminal 2: BullMQ Worker Queues
npm run dev --workspace=@cryptonion/worker

# Terminal 3: Next.js Frontend Dashboard (Port 3000)
npm run dev --workspace=@cryptonion/web

# Terminal 4: Python FastAPI AI Engine (Port 8000)
cd apps/ai && uvicorn app.main:app --port 8000 --reload
```

---

## 📍 API & Service Endpoints

- **Web Dashboard**: `http://localhost:3000`
- **Fastify REST API**: `http://localhost:3001`
- **Interactive Swagger Docs**: `http://localhost:3001/docs`
- **FastAPI AI Microservice**: `http://localhost:8000`
- **MinIO S3 Console**: `http://localhost:9001` (user: `minioadmin`, pass: `minioadmin`)
- **Ollama Engine**: `http://localhost:11434`
