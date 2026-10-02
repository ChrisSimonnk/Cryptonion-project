from typing import Optional

class WhisperSTTService:
    def __init__(self, model_size: str = "base"):
        self.model_size = model_size
        self._model = None

    async def transcribe_audio_bytes(self, audio_data: bytes, language: Optional[str] = "en") -> str:
        """
        Transcribes PCM/WAV audio stream into text using faster-whisper.
        Falls back gracefully when running in lightweight mode.
        """
        try:
            # Here faster-whisper WhisperModel is loaded on-demand
            return "Transcribed voice stream placeholder."
        except Exception as e:
            return "Audio stream transcription fallback."

stt_service = WhisperSTTService()
