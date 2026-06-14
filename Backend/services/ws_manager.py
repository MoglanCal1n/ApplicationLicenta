"""
WebSocket connection manager — maintains a mapping of user_id → active WebSocket connections.
Used by the notification system to push real-time updates to connected clients.
"""
import asyncio
import logging
from typing import Any
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages active WebSocket connections per user."""

    def __init__(self):
        # user_id -> list of active websocket connections (one user may have multiple tabs)
        self.active_connections: dict[int, list[WebSocket]] = {}

    async def connect(self, user_id: int, websocket: WebSocket):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)
        logger.info(f"WS connected: user {user_id} (total: {len(self.active_connections[user_id])})")

    def disconnect(self, user_id: int, websocket: WebSocket):
        if user_id in self.active_connections:
            self.active_connections[user_id] = [
                ws for ws in self.active_connections[user_id] if ws is not websocket
            ]
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        logger.info(f"WS disconnected: user {user_id}")

    async def send_to_user(self, user_id: int, data: dict):
        """Send a JSON message to all of a user's active WebSocket connections."""
        if user_id not in self.active_connections:
            return

        disconnected = []
        for ws in self.active_connections[user_id]:
            try:
                await ws.send_json(data)
            except Exception:
                disconnected.append(ws)

        # Clean up broken connections
        for ws in disconnected:
            self.disconnect(user_id, ws)


# Singleton instance — imported by routers
ws_manager = ConnectionManager()
