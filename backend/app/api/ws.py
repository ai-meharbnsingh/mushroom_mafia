from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query

from app.utils.security import decode_token
from app.services.ws_manager import ws_manager

router = APIRouter()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = Query(...)):
    """WebSocket endpoint for real-time dashboard updates.

    Authenticates the user via a JWT token passed as a query parameter.
    Once connected, the user receives real-time sensor updates, alerts,
    and relay commands for all devices belonging to their owner.
    """
    try:
        payload = decode_token(token)
        user_id = int(payload.get("sub"))
        owner_id = payload.get("owner_id")
    except Exception:
        await websocket.close(code=4001)
        return

    await ws_manager.connect(websocket, owner_id)
    try:
        while True:
            await websocket.receive_text()  # Keep alive
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, owner_id)
