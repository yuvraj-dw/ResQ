import json
import logging
from typing import Dict, Set
from fastapi import WebSocket


logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, phone: str, websocket: WebSocket):
        await websocket.accept()
        if phone not in self.active_connections:
            self.active_connections[phone] = set()
        self.active_connections[phone].add(websocket)
        logger.info(f"WebSocket connected: {phone} (total: {len(self.active_connections[phone])})")

    def disconnect(self, phone: str, websocket: WebSocket):
        if phone in self.active_connections:
            self.active_connections[phone].discard(websocket)
            if not self.active_connections[phone]:
                del self.active_connections[phone]
            logger.info(f"WebSocket disconnected: {phone}")

    async def send_to_phone(self, phone: str, data: dict):
        if phone not in self.active_connections:
            return
        message = json.dumps(data)
        dead = []
        for ws in self.active_connections[phone]:
            try:
                await ws.send_text(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.active_connections[phone].discard(ws)

    async def broadcast_to_phones(self, phones: list, data: dict):
        for phone in phones:
            await self.send_to_phone(phone, data)

    async def broadcast_new_request(self, request_data: dict, volunteer_phones: list):
        payload = {
            "type": "new_request",
            "data": request_data,
        }
        await self.broadcast_to_phones(volunteer_phones, payload)

    async def broadcast_request_update(self, request_id: str, status: str, extra: dict = None):
        payload = {
            "type": "request_update",
            "request_id": request_id,
            "status": status,
        }
        if extra:
            payload.update(extra)
        all_phones = list(self.active_connections.keys())
        await self.broadcast_to_phones(all_phones, payload)

    def get_all_connected_phones(self) -> list:
        return list(self.active_connections.keys())


ws_manager = ConnectionManager()