import asyncio
import time
from typing import Dict, Optional
from loguru import logger
from pipecat.transports.network.webrtc_connection import SmallWebRTCConnection


class ConnectionManager:
    """Manages WebRTC connections with proper cleanup"""
    
    def __init__(self):
        self.connections: Dict[str, SmallWebRTCConnection] = {}
        self.connection_times: Dict[str, float] = {}
        self.bot_tasks: Dict[str, asyncio.Task] = {}
        self._cleanup_task: Optional[asyncio.Task] = None
        self._cleanup_interval = 30  # seconds
        self._connection_timeout = 300  # 5 minutes

    async def start_cleanup_task(self):
        """Start periodic cleanup of stale connections"""
        if self._cleanup_task is None:
            self._cleanup_task = asyncio.create_task(self._periodic_cleanup())
            logger.info("Started connection cleanup task")

    async def stop_cleanup_task(self):
        """Stop cleanup task"""
        if self._cleanup_task:
            self._cleanup_task.cancel()
            try:
                await self._cleanup_task
            except asyncio.CancelledError:
                pass
            self._cleanup_task = None
            logger.info("Stopped connection cleanup task")

    async def add_connection(self, connection: SmallWebRTCConnection, bot_task: asyncio.Task):
        """Add a new connection with its associated bot task"""
        pc_id = connection.pc_id
        self.connections[pc_id] = connection
        self.connection_times[pc_id] = time.time()
        self.bot_tasks[pc_id] = bot_task
        
        # Set up proper disconnect handlers
        @connection.event_handler("closed")
        async def handle_closed():
            await self.remove_connection(pc_id, "closed")
            
        @connection.event_handler("failed")  
        async def handle_failed():
            await self.remove_connection(pc_id, "failed")
        
        logger.info(f"Added connection {pc_id} (total: {len(self.connections)})")

    async def remove_connection(self, pc_id: str, reason: str = "manual"):
        """Remove connection and cleanup resources"""
        if pc_id not in self.connections:
            return
            
        logger.info(f"Removing connection {pc_id} (reason: {reason})")
        
        # Cancel bot task
        if pc_id in self.bot_tasks:
            task = self.bot_tasks.pop(pc_id)
            if not task.done():
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass
                except Exception as e:
                    logger.error(f"Error cancelling bot task for {pc_id}: {e}")
        
        # Close connection
        if pc_id in self.connections:
            connection = self.connections.pop(pc_id)
            try:
                await connection.disconnect()
            except Exception as e:
                logger.warning(f"Error disconnecting {pc_id}: {e}")
        
        # Cleanup tracking
        self.connection_times.pop(pc_id, None)
        
        logger.info(f"Connection {pc_id} removed (remaining: {len(self.connections)})")

    async def get_connection(self, pc_id: str) -> Optional[SmallWebRTCConnection]:
        """Get connection by ID"""
        return self.connections.get(pc_id)

    async def _periodic_cleanup(self):
        """Periodically check for stale connections"""
        while True:
            try:
                await asyncio.sleep(self._cleanup_interval)
                await self._cleanup_stale_connections()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in periodic cleanup: {e}")

    async def _cleanup_stale_connections(self):
        """Remove connections that are too old or in bad state"""
        current_time = time.time()
        stale_connections = []
        
        for pc_id, connection_time in self.connection_times.items():
            if current_time - connection_time > self._connection_timeout:
                stale_connections.append(pc_id)
                continue
                
            # Check connection state
            connection = self.connections.get(pc_id)
            if connection and hasattr(connection, 'pc') and connection.pc:
                state = getattr(connection.pc, 'connectionState', None)
                if state in ['disconnected', 'failed', 'closed']:
                    stale_connections.append(pc_id)
        
        for pc_id in stale_connections:
            logger.warning(f"Cleaning up stale connection: {pc_id}")
            await self.remove_connection(pc_id, "stale")

    async def shutdown(self):
        """Shutdown all connections"""
        logger.info("Shutting down connection manager")
        await self.stop_cleanup_task()
        
        # Remove all connections
        pc_ids = list(self.connections.keys())
        for pc_id in pc_ids:
            await self.remove_connection(pc_id, "shutdown")

    def get_status(self) -> dict:
        """Get current status"""
        return {
            "active_connections": len(self.connections),
            "connection_ids": list(self.connections.keys()),
            "bot_tasks": len(self.bot_tasks)
        }