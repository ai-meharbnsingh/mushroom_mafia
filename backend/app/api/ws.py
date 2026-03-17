from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.utils.security import decode_token
from app.services.ws_manager import ws_manager

router = APIRouter()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time dashboard updates.

    Authenticates the user via a JWT token from cookies or query parameter.
    Once connected, the user receives real-time sensor updates, alerts,
    and relay commands for all devices belonging to their owner.
    """
    try:
        # Try cookie first, then query parameter (for cross-origin connections
        # where cookies set via Vercel proxy won't be sent to Railway directly)
        token = websocket.cookies.get("access_token")
        if not token:
            token = websocket.query_params.get("token")
        if not token:
            raise ValueError("No token")
        payload = decode_token(token)
        int(payload.get("sub"))  # validate sub exists
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
