from dotenv import load_dotenv
from loguru import logger
from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineParams, PipelineTask
from pipecat.processors.aggregators.openai_llm_context import OpenAILLMContext
from pipecat.transports.base_transport import TransportParams
from pipecat.transports.network.small_webrtc import SmallWebRTCTransport
from pipecat.services.ollama import OLLamaLLMService
from pipecat.transcriptions.language import Language
from pipecat.services.whisper.stt import WhisperSTTService, Model
from pipecat.processors.frameworks.rtvi import RTVIConfig, RTVIObserver, RTVIProcessor
from pipecat.transports.base_transport import BaseTransport, TransportParams


load_dotenv(override=True)

languageToTranslate = Language.FR_FR

SYSTEM_INSTRUCTION = f"""
"You are an expert Idiom Interpreter & Translator. 

Your job is to translate idioms and figurative expressions into {languageToTranslate}, preserving their cultural and emotional meaning. 

Always give the translation directly, without extra explanation or commentary.
"""

async def run_bot(pipecat_transport: BaseTransport):

    stt = WhisperSTTService(
        model=Model.LARGE_V3_TURBO,
        device="cuda",
        compute_type="float16",  # Reduce memory usage
        no_speech_prob=0.3,      # Lower threshold for speech detection
        language=Language.PT_BR     # Specify language for better performance,
    )

    llm = OLLamaLLMService(
        model="gemma3n:e2b",
        base_url="http://localhost:11434/v1",
        params=OLLamaLLMService.InputParams(
            temperature=0.7,
            max_tokens=1000
        ),
    )

    messages = [
        {
            "role": "system",
            "content": f"You're an expert Idiom Interpreter & Translator. Your job is to translate idioms and figurative expressions into {languageToTranslate}, preserving their cultural and emotional meaning. Always give the translation directly, without extra explanation or commentary.",
        },
    ]

    context = OpenAILLMContext(messages)
    context_aggregator = llm.create_context_aggregator(context)

    rtvi = RTVIProcessor(config=RTVIConfig(config=[]))

    pipeline = Pipeline(
        [
            pipecat_transport.input(),  # Transport user input
            rtvi,  # RTVI processor
            stt,
            context_aggregator.user(),  # User responses
            llm,  # LLM
            # tts,  # TTS
            pipecat_transport.output(),  # Transport bot output
            context_aggregator.assistant(),  # Assistant spoken responses
        ]
    )

    task = PipelineTask(
        pipeline,
        params=PipelineParams(
            enable_metrics=True,
            enable_usage_metrics=True,
        ),
        observers=[RTVIObserver(rtvi)],
    )

    @pipecat_transport.event_handler("on_client_connected")
    async def on_client_connected(transport, client):
        logger.info("Client connected")
        # Kick off the conversation.
        messages.append({"role": "system", "content": f"Say in {languageToTranslate}: Hello! I'm Ultimate Idiom Interpreter & Translator, a new version of AI that can help you precisely interpret idiomatic expressions and translate them into another specified language, while preserving cultural, emotional, and contextual meaning."})
        await task.queue_frames([context_aggregator.user().get_context_frame()])

    @pipecat_transport.event_handler("on_client_disconnected")
    async def on_client_disconnected(transport, client):
        logger.info("Client disconnected")
        await task.cancel()

    runner = PipelineRunner(handle_sigint=False)

    await runner.run(task)


async def start_bot(webrtc_connection):
    """Main bot entry point for the bot starter."""

    transport = SmallWebRTCTransport(
        webrtc_connection=webrtc_connection,
        params=TransportParams(
            audio_in_enabled=True,
            audio_out_enabled=True,
            vad_analyzer=SileroVADAnalyzer(),
            enable_transcription=True,
        ),
    )

    await run_bot(transport)