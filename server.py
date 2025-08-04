import argparse
import asyncio
import sys
from contextlib import asynccontextmanager

import uvicorn
from bot import start_bot
from bot_service import BotService
from connection_manager import ConnectionManager
from fastapi import BackgroundTasks, FastAPI, Request
from loguru import logger
from pipecat.transports.network.webrtc_connection import IceServer, SmallWebRTCConnection


# Global connection manager
connection_manager = ConnectionManager()

ice_servers = [
    IceServer(
        urls="stun:stun.l.google.com:19302",
    )
]


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start connection cleanup task
    logger.info("Starting connection management")
    await connection_manager.start_cleanup_task()
    
    yield  # Run app
    
    # Cleanup
    logger.info("Shutting down services")
    await connection_manager.shutdown()


app = FastAPI(lifespan=lifespan)


@app.post("/api/offer")
async def offer(request: dict, background_tasks: BackgroundTasks, req: Request):
    pc_id = request.get("pc_id")
    
    try:
        if pc_id:
            existing_connection = await connection_manager.get_connection(pc_id)
            if existing_connection:
                logger.info(f"Reusing connection for client {pc_id}")
                await existing_connection.renegotiate(
                    sdp=request["sdp"],
                    type=request["type"],
                    restart_pc=request.get("restart_pc", False),
                )
                return existing_connection.get_answer()

        # Create new connection
        pipecat_connection = SmallWebRTCConnection(ice_servers)
        await pipecat_connection.initialize(sdp=request["sdp"], type=request["type"])

        target_language = req.query_params.get('language', 'FR_FR')
        source_language = req.query_params.get('sourceLanguage', 'EN_US')
        
        # Create bot task
        bot_task = asyncio.create_task(
            start_bot(pipecat_connection, target_language, source_language)
        )
        
        # Add to connection manager (this will set up disconnect handlers)
        await connection_manager.add_connection(pipecat_connection, bot_task)
        
        answer = pipecat_connection.get_answer()
        logger.info(f"New connection established for client {answer['pc_id']} ({target_language}<-{source_language})")
        
        return answer
        
    except Exception as e:
        logger.error(f"Error handling offer: {e}")
        raise


@app.get("/")
async def serve_index():
    return {"message": "Welcome to Wilbur AI - Idiom Interpreter & Translator", "status": "running"}


@app.get("/api/status")
async def get_status():
    status = connection_manager.get_status()
    status["status"] = "running"
    return status


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Wilbur AI - Idiom Interpreter & Translator")
    parser.add_argument(
        "--host", default="0.0.0.0", help="Host for HTTP server (default: 0.0.0.0)"
    )
    parser.add_argument(
        "--port", type=int, default=7860, help="Port for HTTP server (default: 7860)"
    )
    parser.add_argument("--verbose", "-v", action="count")
    args = parser.parse_args()

    logger.remove(0)
    if args.verbose:
        logger.add(sys.stderr, level="TRACE")
    else:
        logger.add(sys.stderr, level="DEBUG")

    uvicorn.run(app, host=args.host, port=args.port)
