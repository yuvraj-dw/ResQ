import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from app.api.deps import security
from app.core.security import verify_access_token
from app.services.ws_manager import ws_manager


logger = logging.getLogger(__name__)

router = APIRouter(tags=["WebSocket"])


@router.websocket("/ws/volunteer")
async def websocket_volunteer(websocket: WebSocket, token: str = Query(None)):
    await websocket.accept()

    phone = None
    if token:
        payload = verify_access_token(token)
        if payload:
            phone = payload.get("sub")

    if not phone:
        await websocket.close(code=4001, reason="Invalid or missing authentication token")
        return

    try:
        await ws_manager.connect(phone, websocket)
        await websocket.send_text(json.dumps({
            "type": "connected",
            "phone": phone,
            "message": "WebSocket connection established",
        }))

        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                msg_type = message.get("type", "ping")

                if msg_type == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
                elif msg_type == "update_location":
                    await websocket.send_text(json.dumps({
                        "type": "location_received",
                        "message": "Use POST /api/v1/tracking/location to update location",
                    }))
            except json.JSONDecodeError:
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "message": "Invalid JSON",
                }))

    except WebSocketDisconnect:
        ws_manager.disconnect(phone, websocket)
        logger.info(f"Volunteer {phone} disconnected from WebSocket")
    except Exception as e:
        logger.error(f"WebSocket error for {phone}: {e}")
        ws_manager.disconnect(phone, websocket)