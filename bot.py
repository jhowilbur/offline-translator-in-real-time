from dotenv import load_dotenv
from loguru import logger
from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineParams, PipelineTask
from pipecat.processors.aggregators.openai_llm_context import OpenAILLMContext
from pipecat.transports.base_transport import TransportParams
from pipecat.transports.network.small_webrtc import SmallWebRTCTransport
from pipecat.transcriptions.language import Language
from pipecat.processors.frameworks.rtvi import RTVIConfig, RTVIObserver, RTVIProcessor
from pipecat.transports.base_transport import BaseTransport, TransportParams
from bot_service import BotService


load_dotenv(override=True)

async def run_bot(pipecat_transport: BaseTransport, target_language_code: str = 'FR_FR', source_language_code: str = 'EN_US'):
    # Convert language codes to Language enums
    try:
        target_language = getattr(Language, target_language_code)
    except AttributeError:
        target_language = Language.FR_FR

    try:
        source_language = getattr(Language, source_language_code)
    except AttributeError:
        source_language = Language.EN_US

    logger.info(f"Creating dedicated services for client - STT: {source_language}, Target: {target_language}")
    
    # Create dedicated services for this client
    stt = BotService.create_stt_service(source_language)
    llm = BotService.create_llm_service()
    
    logger.info("Client services created successfully")

    # Create client-specific context
    messages = [
        {
            "role": "system",
            "content": BotService.get_system_message(target_language),
        },
    ]

    context = OpenAILLMContext(messages)
    context_aggregator = llm.create_context_aggregator(context)
    rtvi = RTVIProcessor(config=RTVIConfig(config=[]))

    pipeline = Pipeline([
        pipecat_transport.input(),
        rtvi,
        stt,
        context_aggregator.user(),
        llm,
        pipecat_transport.output(),
        context_aggregator.assistant(),
    ])

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
        logger.info(f"Client connected - preparing welcome message in {target_language}")
        welcome_message = BotService.get_welcome_message(target_language)
        messages.append({
            "role": "system", 
            "content": welcome_message
        })
        logger.info(f"Sending welcome message: {welcome_message[:100]}...")
        await task.queue_frames([context_aggregator.user().get_context_frame()])

    @pipecat_transport.event_handler("on_client_disconnected")
    async def on_client_disconnected(transport, client):
        logger.info("Client disconnected from transport")
        # Task cleanup is handled by ConnectionManager

    runner = PipelineRunner(handle_sigint=False)
    await runner.run(task)


async def start_bot(webrtc_connection, target_language_code: str = 'FR_FR', source_language_code: str = 'EN_US'):
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

    await run_bot(transport, target_language_code, source_language_code)