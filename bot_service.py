from loguru import logger
from pipecat.services.ollama import OLLamaLLMService
from pipecat.services.whisper.stt import WhisperSTTService, Model
from pipecat.transcriptions.language import Language


class BotService:
    """Service factory for creating bot instances per client"""
    
    @staticmethod
    def create_stt_service(source_language: Language) -> WhisperSTTService:
        """Create a new STT service instance for each client"""
        logger.info(f"Creating STT service for language: {source_language}")
        stt_params = {
            "model": Model.LARGE_V3_TURBO,
            "device": "cuda",
            "compute_type": "float16",
            "no_speech_prob": 0.3,
            "language": source_language
        }
        return WhisperSTTService(**stt_params)

    @staticmethod
    def create_llm_service() -> OLLamaLLMService:
        """Create a new LLM service instance for each client"""
        logger.info("Creating new LLM service instance")
        return OLLamaLLMService(
            model="gemma3n:e2b",
            base_url="http://localhost:11434/v1",
            params=OLLamaLLMService.InputParams(
                temperature=0.7,
                max_tokens=1000
            ),
        )

    @staticmethod
    def get_system_message(target_language: Language) -> str:
        """Get system message for the given target language"""
        return f"You're an expert Idiom Interpreter & Translator. Your job is to translate idioms and figurative expressions into {target_language}, preserving their cultural and emotional meaning. Always give the translation directly, without extra explanation or commentary."

    @staticmethod
    def get_welcome_message(target_language: Language) -> str:
        """Get welcome message for the given target language"""
        return f"Say in {target_language}: Hello! I'm an AI, Idiom Interpreter & Translator, a new version of AI that can help you precisely interpret idiomatic expressions and translate them into another specified language, while preserving cultural, emotional, and contextual meaning."