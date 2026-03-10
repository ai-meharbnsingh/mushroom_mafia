from fastapi import APIRouter

from app.api.auth import router as auth_router
from app.api.owners import router as owners_router
from app.api.users import router as users_router
from app.api.plants import router as plants_router
from app.api.rooms import router as rooms_router
from app.api.devices import router as devices_router
from app.api.thresholds import router as thresholds_router
from app.api.alerts import router as alerts_router
from app.api.reports import router as reports_router
from app.api.device_api import router as device_api_router
from app.api.live import router as live_router
from app.api.dashboard import router as dashboard_router
from app.api.readings import router as readings_router
from app.api.ws import router as ws_router
from app.api.emqx_auth import router as emqx_auth_router
from app.api.firmware import router as firmware_router
from app.api.harvests import router as harvests_router
from app.api.growth_cycles import router as growth_cycles_router
from app.api.climate_advisory import router as climate_advisory_router

api_router = APIRouter()
api_router.include_router(auth_router, prefix="/auth", tags=["Authentication"])
api_router.include_router(owners_router, prefix="/owners", tags=["Owners"])
api_router.include_router(users_router, prefix="/users", tags=["Users"])
api_router.include_router(plants_router, prefix="/plants", tags=["Plants"])
api_router.include_router(rooms_router, prefix="/rooms", tags=["Rooms"])
api_router.include_router(devices_router, prefix="/devices", tags=["Devices"])
api_router.include_router(thresholds_router, prefix="/thresholds", tags=["Thresholds"])
api_router.include_router(alerts_router, prefix="/alerts", tags=["Alerts"])
api_router.include_router(reports_router, prefix="/reports", tags=["Reports"])
api_router.include_router(device_api_router, prefix="/device", tags=["Device API"])
api_router.include_router(live_router, prefix="/live", tags=["Live Data"])
api_router.include_router(dashboard_router, prefix="/dashboard", tags=["Dashboard"])
api_router.include_router(readings_router, prefix="/readings", tags=["Historical Readings"])
api_router.include_router(ws_router, tags=["WebSocket"])
api_router.include_router(emqx_auth_router, prefix="/emqx", tags=["EMQX Auth"])
api_router.include_router(firmware_router, prefix="/firmware", tags=["Firmware OTA"])
api_router.include_router(harvests_router, prefix="/harvests", tags=["Harvests"])
api_router.include_router(growth_cycles_router, prefix="/growth-cycles", tags=["Growth Cycles"])
api_router.include_router(climate_advisory_router, prefix="/advisory", tags=["Climate Advisory"])
