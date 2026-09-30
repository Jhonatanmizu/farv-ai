from datetime import UTC, datetime

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.services.websocket_manager import ws_manager

router = APIRouter(prefix="/ws", tags=["WebSocket Stream"])


@router.websocket("/stream")
async def websocket_endpoint(websocket: WebSocket) -> None:
    await ws_manager.connect(websocket)
    try:
        await websocket.send_json(
            {
                "event": "connected",
                "message": "FARV-IA WebSocket Connected",
                "server_time": datetime.now(UTC).isoformat(),
            }
        )
        while True:
            text = await websocket.receive_text()
            if text.strip().lower() == "ping":
                await websocket.send_json({"event": "pong"})
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
