"""Background task that periodically checks for offline devices and creates alerts."""

import asyncio
import logging
from datetime import datetime, timezone, timedelta

from sqlalchemy import select, and_

from app.database import async_session_factory
from app.models.device import Device
from app.models.alert import Alert
from app.models.enums import AlertType, Severity

logger = logging.getLogger(__name__)

# Module-level handle for the background task
_monitor_task: asyncio.Task | None = None

# How often to run the check (seconds)
CHECK_INTERVAL_SECONDS = 5 * 60  # 5 minutes

# Devices that haven't reported in this long are considered offline
OFFLINE_THRESHOLD = timedelta(minutes=10)


async def check_device_health() -> dict:
    """Check all active devices for offline status and create alerts.

    Queries devices that have last_seen older than OFFLINE_THRESHOLD.
    For each device that was previously marked online, sets is_online=False
    and creates a DEVICE_OFFLINE alert.

    Returns a summary dict with counts of checked/transitioned devices.
    """
    now = datetime.now(timezone.utc)
    cutoff = now - OFFLINE_THRESHOLD

    transitioned = 0
    already_offline = 0
    total_checked = 0

    try:
        async with async_session_factory() as db:
            # Find active devices whose last_seen is older than the cutoff
            # (or last_seen is NULL, meaning they never reported)
            result = await db.execute(
                select(Device).where(
                    Device.is_active == True,
                    Device.is_online == True,
                    Device.last_seen.isnot(None),
                    Device.last_seen < cutoff,
                )
            )
            stale_devices = result.scalars().all()
            total_checked = len(stale_devices)

            for device in stale_devices:
                # Transition: online -> offline
                device.is_online = False
                transitioned += 1

                # Create a DEVICE_OFFLINE alert if the device has a room_id
                if device.room_id is not None:
                    # Check if there's already an unresolved DEVICE_OFFLINE alert
                    existing_alert = await db.execute(
                        select(Alert).where(
                            Alert.device_id == device.device_id,
                            Alert.alert_type == AlertType.DEVICE_OFFLINE,
                            Alert.is_resolved == False,
                        )
                    )
                    if existing_alert.scalar_one_or_none() is None:
                        alert = Alert(
                            device_id=device.device_id,
                            room_id=device.room_id,
                            alert_type=AlertType.DEVICE_OFFLINE,
                            severity=Severity.WARNING,
                            parameter="connectivity",
                            message=f"Device {device.device_name or device.device_id} has not reported data for over 10 minutes.",
                            is_read=False,
                            is_resolved=False,
                        )
                        db.add(alert)

            if transitioned > 0:
                await db.commit()
                logger.warning(
                    "Device monitor: %d device(s) marked offline out of %d stale",
                    transitioned,
                    total_checked,
                )
            else:
                logger.debug(
                    "Device monitor: all devices healthy (%d stale checked)",
                    total_checked,
                )

    except Exception:
        logger.exception("Device monitor check failed")

    return {
        "checked": total_checked,
        "transitioned_offline": transitioned,
        "already_offline": already_offline,
    }


async def _monitor_loop() -> None:
    """Infinite loop that runs check_device_health every CHECK_INTERVAL_SECONDS."""
    logger.info(
        "Device monitor started (interval=%ds, threshold=%s)",
        CHECK_INTERVAL_SECONDS,
        OFFLINE_THRESHOLD,
    )
    while True:
        try:
            await check_device_health()
        except asyncio.CancelledError:
            logger.info("Device monitor cancelled")
            raise
        except Exception:
            logger.exception("Unhandled error in device monitor loop")

        try:
            await asyncio.sleep(CHECK_INTERVAL_SECONDS)
        except asyncio.CancelledError:
            logger.info("Device monitor cancelled during sleep")
            raise


def start_device_monitor() -> None:
    """Create the background asyncio task for the device monitor."""
    global _monitor_task
    if _monitor_task is not None and not _monitor_task.done():
        logger.warning("Device monitor is already running")
        return
    _monitor_task = asyncio.create_task(_monitor_loop())
    logger.info("Device monitor task created")


def stop_device_monitor() -> None:
    """Cancel the device monitor background task."""
    global _monitor_task
    if _monitor_task is not None and not _monitor_task.done():
        _monitor_task.cancel()
        logger.info("Device monitor task cancelled")
    _monitor_task = None
