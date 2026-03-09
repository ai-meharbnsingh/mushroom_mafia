import asyncio
from sqlalchemy import select, update, delete
from app.database import async_session_factory
from app.models.device import Device
from app.models.room import Room
from app.models.enums import SubscriptionStatus

async def add_device():
    mac = "c8:f0:9e:a0:f2:d0".upper()
    license_key = "LIC-A3F7-K9M2-P5X8" # The key your device is showing
    
    async with async_session_factory() as db:
        # Clear existing for this MAC or Key to avoid conflicts
        await db.execute(delete(Device).where(Device.mac_address == mac))
        await db.execute(delete(Device).where(Device.license_key == license_key))
        
        # Add fresh registration
        room_result = await db.execute(select(Room).limit(1))
        room = room_result.scalar_one_or_none()
        
        device = Device(
            room_id=room.room_id,
            license_key=license_key,
            mac_address=mac,
            device_name="My-ESP32-P5X8",
            is_active=True,
            subscription_status=SubscriptionStatus.ACTIVE,
            firmware_version="3.0.0"
        )
        db.add(device)
        await db.commit()
        print(f"Successfully registered MAC {mac} with key {license_key}")

if __name__ == "__main__":
    asyncio.run(add_device())
