# CRYPTONION INTELLIGENCE — DEPENDENCY MAP (R2)

## Architectural Role

Cryptonion Intelligence is an autonomous, stateless AI computation service. It powers:
- FastAPI HTTP service runtime
- Multi-provider LLM inference (Ollama, OpenAI, Anthropic Claude)
- AI Employee reasoning engine (bounded turn execution)
- Vector embedding generation & computation helpers
- Speech-to-Text (STT) via Whisper / faster-whisper
- Text-to-Speech (TTS) via Piper

Platform (`cryptonion-platform`) remains the authoritative system of record for identity, organizations, employees, persistence, RBAC, and background business queues.

---

## Service Architecture

```text
FastAPI (app/main.py)
  │
  ├── Agent Engine (app/agents/engine.py)
  │     └── Bounded turn execution & context assembly
  │
  ├── LLM Providers (app/llm/provider.py)
  │     ├── BaseLLMProvider (abstract contract)
  │     ├── OllamaProvider (local HTTP backend)
  │     ├── OpenAIProvider (remote REST)
  │     └── AnthropicProvider (remote REST)
  │
  ├── Speech Processing
  │     ├── STT: WhisperSTTService (app/stt/whisper.py)
  │     └── TTS: PiperTTSService (app/tts/piper.py)
  │
  └── RAG / Embedding Computation (app/rag/retriever.py)
        └── pgvector similarity computation interface
```

---

## Dependency Classification Matrix

| Dependency / Component | Category | Classification | Rationale / Resolution |
| :--- | :--- | :--- | :--- |
| **FastAPI / Uvicorn** | Framework | **MOVE** | Extracted directly into `cryptonion-intelligence`. |
| **Pydantic / Pydantic-Settings** | Validation | **MOVE** | Request/response schema models preserved. |
| **HTTPX** | Network Client | **MOVE** | Async client used for Ollama, OpenAI, Anthropic calls. |
| **Python-Dotenv** | Config | **MOVE** | Decoupled from monorepo root to standalone repo root `.env`. |
| **Ollama Backend** | External Provider | **SAFE** | Accessed over HTTP via `OLLAMA_BASE_URL` (default: `http://localhost:11434`). |
| **OpenAI / Anthropic APIs** | External Provider | **SAFE** | Accessed via HTTPS using standard API keys. |
| **Faster-Whisper / Whisper** | Voice STT | **MOVE** | Local neural STT inference. |
| **Piper TTS** | Voice TTS | **MOVE** | Local neural voice synthesis. |
| **PostgreSQL / Sequelize** | Database / ORM | **REMOVE / SAFE** | **REMOVE** from direct ownership in Intelligence. Platform is system of record for business tables. Intelligence does not manage migrations or schema. RAG queries are computational. |
| **Redis / BullMQ** | Queues | **REMOVE** | BullMQ is owned strictly by `cryptonion-platform` worker processes. Intelligence is stateless request/reply. |
| **@cryptonion/shared** | TypeScript Contract | **REPLACE** | Zero TypeScript imports in Python. HTTP JSON schema serves as the wire contract between Platform and Intelligence. |
| **@cryptonion/db** | Database Models | **REMOVE** | Intelligence has no TypeScript DB models. |
| **Monorepo Root `.env`** | Environment | **REPLACE** | Standalone `.env` in `cryptonion-intelligence/` using `.env.example`. |

---

## API Contract Boundaries (Platform ➔ Intelligence)

The wire contract is strictly HTTP/JSON over internal network:

1. `GET /health` & `GET /ai/health`
   - Returns service status, default model, and configured backend.
2. `POST /ai/agent/turn`
   - Request: `ChatTurnRequest` (`system_prompt`, `chat_history`, `user_input`, `llm_config`, `max_turns`).
   - Response: `{"success": true, "data": { "reply", "provider", "model", "tokens_used", "latency_ms", "status", "turns_executed" }}`.
3. `POST /ai/tts/synthesize`
   - Request: `SynthesisRequest` (`text`, `voice_id`, `speed`).
   - Response: `{"success": true, "data": { "format": "audio/wav", "bytes_length": int }}`.
