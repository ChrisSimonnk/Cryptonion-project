# CRYPTONION INTELLIGENCE — PROVIDER SPECIFICATION

## Overview
This document details the LLM and speech provider configurations, models, endpoints, timeouts, retry behaviors, and error handling for the Cryptonion Intelligence service.

---

## 1. LLM Providers

### 1.1 Ollama (Local LLM Provider)
* **Provider Identifier**: `ollama`
* **Configuration Variable**: `OLLAMA_BASE_URL` (default: `http://localhost:11434`)
* **Default Model**: `llama3:8b` (configured via `DEFAULT_LLM_MODEL`)
* **Endpoint**: `POST {OLLAMA_BASE_URL}/api/chat`
* **Health Check**: `GET {OLLAMA_BASE_URL}/api/tags`
* **Timeout**: Configured by `LLM_TIMEOUT_SECONDS` (default: 30.0s)
* **Retry / Fallback Behavior**:
  * If the Ollama server is offline or unreachable, returns a deterministic bounded fallback simulation response:
    `"Simulated AI Response (Model: {model}): I received your message and am ready to assist."`
  * Includes `fallback: True` and error details in response metadata.
  * Preserves service uptime without dropping client turn execution.

### 1.2 OpenAI (Remote Cloud LLM Provider)
* **Provider Identifier**: `openai`
* **Configuration Variable**: `OPENAI_API_KEY`
* **Default Model**: `gpt-4o-mini`
* **Endpoint**: `POST https://api.openai.com/v1/chat/completions`
* **Health Check**: Checks presence of `OPENAI_API_KEY`
* **Timeout**: Configured by `LLM_TIMEOUT_SECONDS` (default: 30.0s)
* **Retry / Fallback Behavior**:
  * Unconfigured Key: Returns sandbox development response with `simulated: True`.
  * API Error / Rate Limit / Timeout: Catches exceptions, returns graceful fallback response with `fallback: True` and error message.

### 1.3 Anthropic Claude (Remote Cloud LLM Provider)
* **Provider Identifier**: `anthropic`
* **Configuration Variable**: `ANTHROPIC_API_KEY`
* **Default Model**: `claude-3-5-sonnet-20241022`
* **Endpoint**: `POST https://api.anthropic.com/v1/messages`
* **Headers**: `x-api-key: {ANTHROPIC_API_KEY}`, `anthropic-version: 2023-06-01`
* **Health Check**: Checks presence of `ANTHROPIC_API_KEY`
* **Timeout**: Configured by `LLM_TIMEOUT_SECONDS` (default: 30.0s)
* **Retry / Fallback Behavior**:
  * Unconfigured Key: Returns sandbox development response with `simulated: True`.
  * API Error / Rate Limit / Timeout: Returns graceful fallback response with `fallback: True` and error message.

---

## 2. Speech Providers

### 2.1 Speech-to-Text (STT)
* **Engine**: Faster-Whisper / Whisper
* **Configuration Variable**: `STT_MODEL_SIZE` (default: `base`)
* **Supported Languages**: Multilingual (default: `en`)
* **Inference**: On-demand local execution with graceful fallback.

### 2.2 Text-to-Speech (TTS)
* **Engine**: Piper TTS
* **Configuration Variable**: `TTS_VOICE_MODEL` (default: `en_US-lessac-medium`)
* **Format**: PCM / WAV byte stream (`audio/wav`)
* **Endpoint**: `POST /ai/tts/synthesize`
* **Latency Profile**: Designed for low-latency neural synthesis.

---

## 3. Provider Resolution & Factory
The `get_llm_provider(provider_type: str)` factory in `app.llm.provider` dynamically returns the configured implementation:
* Supported strings: `ollama`, `openai`, `anthropic`, `custom`.
* Unrecognized providers raise a `ValueError("Unsupported LLM provider: {provider_type}")` with HTTP 500 translation in FastAPI routes.
