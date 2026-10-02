import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "../../../.env"))

class Settings:
    APP_NAME: str = "Cryptonion AI Service"
    PORT: int = int(os.getenv("AI_SERVICE_PORT", "8000"))
    HOST: str = os.getenv("AI_SERVICE_HOST", "0.0.0.0")
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    DEFAULT_LLM_MODEL: str = os.getenv("DEFAULT_LLM_MODEL", "llama3:8b")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    LLM_TIMEOUT_SECONDS: float = float(os.getenv("LLM_TIMEOUT_SECONDS", "30.0"))
    MAX_REASONING_TURNS: int = int(os.getenv("MAX_REASONING_TURNS", "1"))
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://cryptonion:cryptonion_secret@localhost:5432/cryptonion")
    STT_MODEL_SIZE: str = os.getenv("STT_MODEL_SIZE", "base")
    TTS_VOICE_MODEL: str = os.getenv("TTS_VOICE_MODEL", "en_US-lessac-medium")

settings = Settings()

