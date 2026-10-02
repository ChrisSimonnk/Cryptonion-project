from fastapi import FastAPI, HTTPException
# pyrefly: ignore [missing-import]
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

from app.core.config import settings
from app.agents.engine import agent_engine
from app.llm.provider import get_llm_provider
from app.stt.whisper import stt_service
from app.tts.piper import tts_service

app = FastAPI(
    title="Cryptonion AI Engine",
    description="Microservice powering autonomous LLM execution, Voice STT/TTS, and RAG retrieval",
    version="1.0.0",
)

class ChatTurnRequest(BaseModel):
    system_prompt: str = Field(default="You are an autonomous AI employee.")
    chat_history: List[Dict[str, str]] = Field(default_factory=list)
    user_input: str
    llm_config: Optional[Dict[str, Any]] = None
    max_turns: int = Field(default=1, ge=1, le=5)

class SynthesisRequest(BaseModel):
    text: str
    voice_id: str = "en_US-lessac-medium"
    speed: float = 1.0

@app.get("/health")
@app.get("/ai/health")
async def health_check():
    return {
        "status": "ok",
        "service": settings.APP_NAME,
        "default_model": settings.DEFAULT_LLM_MODEL,
        "ollama_backend": settings.OLLAMA_BASE_URL,
    }

@app.post("/ai/agent/turn")
async def process_agent_turn(payload: ChatTurnRequest):
    try:
        result = await agent_engine.execute_turn(
            system_prompt=payload.system_prompt,
            chat_history=payload.chat_history,
            user_input=payload.user_input,
            llm_config=payload.llm_config,
            max_turns=payload.max_turns,
        )
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ai/tts/synthesize")
async def synthesize_speech(payload: SynthesisRequest):
    try:
        audio = await tts_service.synthesize_speech(text=payload.text, speed=payload.speed)
        return {
            "success": True,
            "data": {
                "format": "audio/wav",
                "bytes_length": len(audio),
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=settings.HOST, port=settings.PORT)
