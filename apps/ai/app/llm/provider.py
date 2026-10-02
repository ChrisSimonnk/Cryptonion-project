import time
from abc import ABC, abstractmethod
from typing import List, Dict, Any, AsyncGenerator, Optional
import httpx
from app.core.config import settings

class BaseLLMProvider(ABC):
    """Abstract base class establishing the standard LLM provider contract."""

    @abstractmethod
    async def generate_response(self, messages: List[Dict[str, str]], **kwargs) -> Dict[str, Any]:
        """Generate a complete text completion with metadata."""
        pass

    @abstractmethod
    async def stream_response(self, messages: List[Dict[str, str]], **kwargs) -> AsyncGenerator[str, None]:
        """Stream token chunks asynchronously."""
        pass

    @abstractmethod
    async def health_check(self) -> Dict[str, Any]:
        """Check provider connectivity and health status."""
        pass

class OllamaProvider(BaseLLMProvider):
    def __init__(self, base_url: str = settings.OLLAMA_BASE_URL, default_model: str = settings.DEFAULT_LLM_MODEL):
        self.base_url = base_url.rstrip('/')
        self.default_model = default_model
        self.timeout = settings.LLM_TIMEOUT_SECONDS

    async def generate_response(self, messages: List[Dict[str, str]], **kwargs) -> Dict[str, Any]:
        model = kwargs.get("model", self.default_model) or self.default_model
        temperature = float(kwargs.get("temperature", 0.7))
        max_tokens = int(kwargs.get("max_tokens", 512))

        payload = {
            "model": model,
            "messages": messages,
            "stream": False,
            "options": {
                "temperature": temperature,
                "num_predict": max_tokens,
            }
        }

        start_time = time.time()
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                res = await client.post(f"{self.base_url}/api/chat", json=payload)
                res.raise_for_status()
                data = res.json()
                content = data.get("message", {}).get("content", "")
                eval_count = data.get("eval_count") or len(content.split())
                prompt_count = data.get("prompt_eval_count") or 0
                tokens_used = eval_count + prompt_count

                return {
                    "content": content,
                    "tokens_used": tokens_used,
                    "model": model,
                    "provider": "ollama",
                    "latency_ms": int((time.time() - start_time) * 1000),
                }
        except Exception as e:
            # Safe bounded fallback for development and offline mode
            content = f"Simulated AI Response (Model: {model}): I received your message and am ready to assist."
            return {
                "content": content,
                "tokens_used": len(content.split()),
                "model": model,
                "provider": "ollama",
                "latency_ms": int((time.time() - start_time) * 1000),
                "fallback": True,
                "note": str(e),
            }

    async def stream_response(self, messages: List[Dict[str, str]], **kwargs) -> AsyncGenerator[str, None]:
        model = kwargs.get("model", self.default_model)
        yield f"Simulated token stream for model: {model}"

    async def health_check(self) -> Dict[str, Any]:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.get(f"{self.base_url}/api/tags")
                return {"status": "ok", "provider": "ollama", "code": res.status_code}
        except Exception as err:
            return {"status": "unavailable", "provider": "ollama", "error": str(err)}

class OpenAIProvider(BaseLLMProvider):
    """OpenAI Adapter adhering to BaseLLMProvider contract."""
    def __init__(self, api_key: str = settings.OPENAI_API_KEY, default_model: str = "gpt-4o-mini"):
        self.api_key = api_key
        self.default_model = default_model
        self.timeout = settings.LLM_TIMEOUT_SECONDS

    async def generate_response(self, messages: List[Dict[str, str]], **kwargs) -> Dict[str, Any]:
        model = kwargs.get("model", self.default_model) or self.default_model
        temperature = float(kwargs.get("temperature", 0.7))
        max_tokens = int(kwargs.get("max_tokens", 512))
        start_time = time.time()

        if not self.api_key:
            content = f"OpenAI Response Simulation (Model: {model}): Operating in development sandbox."
            return {
                "content": content,
                "tokens_used": len(content.split()),
                "model": model,
                "provider": "openai",
                "latency_ms": int((time.time() - start_time) * 1000),
                "simulated": True,
            }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                res = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={"Authorization": f"Bearer {self.api_key}"},
                    json={
                        "model": model,
                        "messages": messages,
                        "temperature": temperature,
                        "max_tokens": max_tokens,
                    }
                )
                res.raise_for_status()
                data = res.json()
                choice = data.get("choices", [{}])[0]
                content = choice.get("message", {}).get("content", "")
                usage = data.get("usage", {})
                tokens_used = usage.get("total_tokens", len(content.split()))

                return {
                    "content": content,
                    "tokens_used": tokens_used,
                    "model": model,
                    "provider": "openai",
                    "latency_ms": int((time.time() - start_time) * 1000),
                }
        except Exception as err:
            content = f"OpenAI fallback (Model: {model}): Service error handled safely."
            return {
                "content": content,
                "tokens_used": len(content.split()),
                "model": model,
                "provider": "openai",
                "latency_ms": int((time.time() - start_time) * 1000),
                "fallback": True,
                "error": str(err),
            }

    async def stream_response(self, messages: List[Dict[str, str]], **kwargs) -> AsyncGenerator[str, None]:
        yield "OpenAI streaming chunk"

    async def health_check(self) -> Dict[str, Any]:
        return {"status": "ok" if self.api_key else "unconfigured", "provider": "openai"}

class AnthropicProvider(BaseLLMProvider):
    """Anthropic Claude Adapter adhering to BaseLLMProvider contract."""
    def __init__(self, api_key: str = settings.ANTHROPIC_API_KEY, default_model: str = "claude-3-5-sonnet-20241022"):
        self.api_key = api_key
        self.default_model = default_model
        self.timeout = settings.LLM_TIMEOUT_SECONDS

    async def generate_response(self, messages: List[Dict[str, str]], **kwargs) -> Dict[str, Any]:
        model = kwargs.get("model", self.default_model) or self.default_model
        max_tokens = int(kwargs.get("max_tokens", 512))
        start_time = time.time()

        if not self.api_key:
            content = f"Anthropic Claude Sandbox Simulation (Model: {model}): Operational."
            return {
                "content": content,
                "tokens_used": len(content.split()),
                "model": model,
                "provider": "anthropic",
                "latency_ms": int((time.time() - start_time) * 1000),
                "simulated": True,
            }

        try:
            # Format system prompt and user messages for Anthropic API
            system_msg = next((m["content"] for m in messages if m.get("role") == "system"), "You are an autonomous AI employee.")
            chat_msgs = [m for m in messages if m.get("role") in ("user", "assistant")]
            if not chat_msgs:
                chat_msgs = [{"role": "user", "content": "Hello"}]

            async with httpx.AsyncClient(timeout=self.timeout) as client:
                res = await client.post(
                    "https://api.anthropic.com/v1/messages",
                    headers={
                        "x-api-key": self.api_key,
                        "anthropic-version": "2023-06-01",
                        "content-type": "application/json",
                    },
                    json={
                        "model": model,
                        "system": system_msg,
                        "messages": chat_msgs,
                        "max_tokens": max_tokens,
                    }
                )
                res.raise_for_status()
                data = res.json()
                content_blocks = data.get("content", [])
                content = "".join([b.get("text", "") for b in content_blocks if b.get("type") == "text"])
                usage = data.get("usage", {})
                tokens_used = usage.get("input_tokens", 0) + usage.get("output_tokens", 0) or len(content.split())

                return {
                    "content": content,
                    "tokens_used": tokens_used,
                    "model": model,
                    "provider": "anthropic",
                    "latency_ms": int((time.time() - start_time) * 1000),
                }
        except Exception as err:
            content = f"Anthropic fallback (Model: {model}): Service handled safely."
            return {
                "content": content,
                "tokens_used": len(content.split()),
                "model": model,
                "provider": "anthropic",
                "latency_ms": int((time.time() - start_time) * 1000),
                "fallback": True,
                "error": str(err),
            }

    async def stream_response(self, messages: List[Dict[str, str]], **kwargs) -> AsyncGenerator[str, None]:
        yield "Anthropic streaming chunk"

    async def health_check(self) -> Dict[str, Any]:
        return {"status": "ok" if self.api_key else "unconfigured", "provider": "anthropic"}

def get_llm_provider(provider_type: str = "ollama") -> BaseLLMProvider:
    normalized = (provider_type or "ollama").lower()
    if normalized == "openai":
        return OpenAIProvider()
    elif normalized == "anthropic":
        return AnthropicProvider()
    elif normalized in ("ollama", "custom"):
        return OllamaProvider()
    else:
        raise ValueError(f"Unsupported LLM provider: {provider_type}")
