import json
from collections import defaultdict

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[int, list[WebSocket]] = defaultdict(list)

    async def connect(self, websocket: WebSocket, owner_id: int):
        await websocket.accept()
        self.active_connections[owner_id].append(websocket)

    def disconnect(self, websocket: WebSocket, owner_id: int):
        if websocket in self.active_connections[owner_id]:
            self.active_connections[owner_id].remove(websocket)

    async def broadcast_to_owner(self, owner_id: int, event: str, payload: dict):
        message = json.dumps({"event": event, "payload": payload}, default=str)
        dead = []
        for ws in self.active_connections[owner_id]:
            try:
                await ws.send_text(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws, owner_id)


ws_manager = ConnectionManager()
