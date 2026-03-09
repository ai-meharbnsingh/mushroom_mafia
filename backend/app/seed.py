"""
Seed script for the Mushroom Farm IoT Platform.
Run with: python -m app.seed
"""

import asyncio

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import engine, async_session_factory, Base
from app.models.owner import Owner
from app.models.user import User
from app.models.plant import Plant
from app.models.room import Room
from app.models.device import Device
from app.models.threshold import Threshold
from app.models.enums import (
    UserRole,
    PlantType,
    RoomType,
    DeviceType,
    ThresholdParameter,
    SubscriptionStatus,
)
from app.utils.security import hash_password


async def seed():
    # Create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session_factory() as db:
        # Check if data already exists
        result = await db.execute(select(Owner))
        if result.scalar_one_or_none():
            print("Database already seeded. Skipping.")
            return

        # 1. Create demo Owner
        owner = Owner(
            company_name="Demo Farm",
            owner_name="Admin",
            email="admin@mushroomfarm.com",
            country="India",
        )
        db.add(owner)
        await db.flush()
        print(f"Created Owner: {owner.company_name} (owner_id={owner.owner_id})")

        # 2. Create Admin user
        admin_user = User(
            owner_id=owner.owner_id,
            username="admin",
            email="admin@mushroomfarm.com",
            password_hash=hash_password("admin123"),
            first_name="Admin",
            last_name="User",
            role=UserRole.ADMIN,
        )
        db.add(admin_user)
        await db.flush()
        print(f"Created User: {admin_user.username} (role={admin_user.role.value})")

        # 3. Create sample Plant
        plant = Plant(
            owner_id=owner.owner_id,
            plant_name="North Valley Farm",
            plant_code="NVF-001",
            plant_type=PlantType.OYSTER,
            no_of_rooms=2,
        )
        db.add(plant)
        await db.flush()
        print(f"Created Plant: {plant.plant_name} (plant_id={plant.plant_id})")

        # 4. Create 2 sample Rooms
        room1 = Room(
            plant_id=plant.plant_id,
            room_name="Fruiting Room 1",
            room_code="NVF-FR-001",
            room_type=RoomType.FRUITING,
        )
        room2 = Room(
            plant_id=plant.plant_id,
            room_name="Spawn Run Room 2",
            room_code="NVF-SR-002",
            room_type=RoomType.SPAWN_RUN,
        )
        db.add_all([room1, room2])
        await db.flush()
        print(f"Created Room: {room1.room_name} (room_id={room1.room_id})")
        print(f"Created Room: {room2.room_name} (room_id={room2.room_id})")

        # 5. Create sample Device
        device = Device(
            room_id=room1.room_id,
            license_key="LIC-A3F7-K9M2-P5X8",
            mac_address="AA:BB:CC:DD:EE:FF",
            device_name="ESP32-Sensor-01",
            device_type=DeviceType.ESP32,
            firmware_version="1.0.0",
            subscription_status=SubscriptionStatus.ACTIVE,
        )
        db.add(device)
        await db.flush()
        print(f"Created Device: {device.device_name} (device_id={device.device_id})")

        # 6. Create default Thresholds for each room
        threshold_defaults = [
            (ThresholdParameter.CO2, 1200, 1300, 100),
            (ThresholdParameter.HUMIDITY, 87.5, 90, 2.5),
            (ThresholdParameter.TEMPERATURE, 16, 17, 1),
        ]

        for room in [room1, room2]:
            for param, min_val, max_val, hyst in threshold_defaults:
                threshold = Threshold(
                    room_id=room.room_id,
                    parameter=param,
                    min_value=min_val,
                    max_value=max_val,
                    hysteresis=hyst,
                    updated_by=admin_user.user_id,
                )
                db.add(threshold)
            print(f"Created 3 Thresholds for: {room.room_name}")

        await db.commit()
        print("\nSeed completed successfully!")


if __name__ == "__main__":
    asyncio.run(seed())
