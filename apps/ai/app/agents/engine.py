import time
from typing import List, Dict, Any, Optional
from app.llm.provider import get_llm_provider
from app.core.config import settings

class AgentEngine:
    """Foundational AI Employee Runtime Engine for Phase 3.
    
    Provides bounded reasoning execution without external tool or RAG coupling.
    """

    def __init__(self):
        self.max_history_turns = 10
        self.max_execution_turns = settings.MAX_REASONING_TURNS

    async def execute_turn(
        self,
        system_prompt: str,
        chat_history: List[Dict[str, str]],
        user_input: str,
        llm_config: Optional[Dict[str, Any]] = None,
        max_turns: int = 1,
    ) -> Dict[str, Any]:
        start_time = time.time()
        cfg = llm_config or {}
        provider_name = cfg.get("provider", "ollama")
        model_name = cfg.get("model", settings.DEFAULT_LLM_MODEL)
        temperature = float(cfg.get("temperature", 0.7))
        max_tokens = int(cfg.get("maxTokens") or cfg.get("max_tokens") or 512)

        # Provider abstraction resolution
        provider = get_llm_provider(provider_name)

        # Context boundary assembly (Phase 3: System instructions + bounded recent chat history + current input)
        messages: List[Dict[str, str]] = [
            {"role": "system", "content": system_prompt or "You are an autonomous AI employee."}
        ]

        # Bound chat history to prevent context overflow
        bounded_history = (chat_history or [])[-self.max_history_turns:]
        for msg in bounded_history:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            if role in ("system", "user", "assistant") and content:
                messages.append({"role": role, "content": content})

        # Append current user turn
        messages.append({"role": "user", "content": user_input})

        # Single bounded execution turn (Phase 3 strict boundary)
        bounded_turn_limit = min(max(1, max_turns), self.max_execution_turns)
        
        execution_result = await provider.generate_response(
            messages=messages,
            model=model_name,
            temperature=temperature,
            max_tokens=max_tokens,
        )

        total_latency_ms = int((time.time() - start_time) * 1000)

        return {
            "reply": execution_result.get("content", ""),
            "provider": execution_result.get("provider", provider_name),
            "model": execution_result.get("model", model_name),
            "tokens_used": execution_result.get("tokens_used", 0),
            "latency_ms": execution_result.get("latency_ms", total_latency_ms),
            "status": "COMPLETED",
            "turns_executed": bounded_turn_limit,
        }

agent_engine = AgentEngine()
