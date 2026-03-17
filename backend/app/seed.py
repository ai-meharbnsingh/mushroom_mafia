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
    GrowthStage,
)
from app.models.climate_guideline import ClimateGuideline
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

        # 7. Seed climate guidelines
        await seed_climate_guidelines(db)


async def seed_climate_guidelines(db: AsyncSession):
    """Seed default climate guidelines for all plant types and growth stages.

    Can be called independently or as part of the main seed function.
    Skips if guidelines already exist.
    """
    # Check if guidelines already exist
    result = await db.execute(select(ClimateGuideline).limit(1))
    if result.scalar_one_or_none():
        print("Climate guidelines already seeded. Skipping.")
        return

    # Each entry: (plant_type, stage, temp_min, temp_max, hum_min, hum_max,
    #              co2_min, co2_max, days_min, days_max, notes)
    guidelines_data = [
        # ── OYSTER ──────────────────────────────────────────────────────
        (
            PlantType.OYSTER,
            GrowthStage.INOCULATION,
            20,
            24,
            60,
            70,
            None,
            None,
            2,
            3,
            "Keep sterile, minimal air exchange",
        ),
        (
            PlantType.OYSTER,
            GrowthStage.SPAWN_RUN,
            24,
            28,
            80,
            85,
            None,
            5000,
            14,
            21,
            "Darkness preferred, CO2 tolerance high",
        ),
        (
            PlantType.OYSTER,
            GrowthStage.INCUBATION,
            20,
            24,
            85,
            90,
            None,
            2000,
            7,
            14,
            "Gradual fresh air introduction",
        ),
        (
            PlantType.OYSTER,
            GrowthStage.FRUITING,
            13,
            18,
            85,
            95,
            400,
            1000,
            5,
            10,
            "CO2 critical! Max ventilation needed",
        ),
        (
            PlantType.OYSTER,
            GrowthStage.HARVEST,
            15,
            20,
            70,
            80,
            None,
            None,
            1,
            3,
            "Reduce humidity to firm up caps",
        ),
        (
            PlantType.OYSTER,
            GrowthStage.IDLE,
            None,
            None,
            None,
            None,
            None,
            None,
            None,
            None,
            "Room resting, clean and sanitize",
        ),
        # ── BUTTON ──────────────────────────────────────────────────────
        (
            PlantType.BUTTON,
            GrowthStage.INOCULATION,
            22,
            25,
            65,
            75,
            None,
            None,
            1,
            2,
            "Sterile substrate preparation",
        ),
        (
            PlantType.BUTTON,
            GrowthStage.SPAWN_RUN,
            24,
            27,
            85,
            90,
            None,
            8000,
            14,
            21,
            "Keep covered, no light needed",
        ),
        (
            PlantType.BUTTON,
            GrowthStage.INCUBATION,
            20,
            22,
            90,
            95,
            None,
            3000,
            10,
            14,
            "Casing layer applied, gentle misting",
        ),
        (
            PlantType.BUTTON,
            GrowthStage.FRUITING,
            16,
            18,
            85,
            90,
            800,
            1500,
            7,
            14,
            "Good air flow, indirect light",
        ),
        (
            PlantType.BUTTON,
            GrowthStage.HARVEST,
            15,
            18,
            70,
            80,
            None,
            None,
            2,
            4,
            "Harvest when caps still closed",
        ),
        (
            PlantType.BUTTON,
            GrowthStage.IDLE,
            None,
            None,
            None,
            None,
            None,
            None,
            None,
            None,
            "Room resting",
        ),
        # ── SHIITAKE ────────────────────────────────────────────────────
        (
            PlantType.SHIITAKE,
            GrowthStage.INOCULATION,
            20,
            25,
            60,
            70,
            None,
            None,
            1,
            2,
            "Log or bag inoculation",
        ),
        (
            PlantType.SHIITAKE,
            GrowthStage.SPAWN_RUN,
            20,
            25,
            70,
            80,
            None,
            5000,
            30,
            60,
            "Long colonization period",
        ),
        (
            PlantType.SHIITAKE,
            GrowthStage.INCUBATION,
            18,
            22,
            80,
            85,
            None,
            2000,
            14,
            21,
            "Cold shock may help initiation",
        ),
        (
            PlantType.SHIITAKE,
            GrowthStage.FRUITING,
            10,
            16,
            80,
            90,
            500,
            1000,
            7,
            14,
            "Cool temps trigger fruiting",
        ),
        (
            PlantType.SHIITAKE,
            GrowthStage.HARVEST,
            12,
            18,
            70,
            80,
            None,
            None,
            2,
            3,
            "Harvest before caps flatten",
        ),
        (
            PlantType.SHIITAKE,
            GrowthStage.IDLE,
            None,
            None,
            None,
            None,
            None,
            None,
            None,
            None,
            "Room resting",
        ),
        # ── MIXED ──────────────────────────────────────────────────────
        (
            PlantType.MIXED,
            GrowthStage.INOCULATION,
            20,
            24,
            60,
            70,
            None,
            None,
            2,
            3,
            "General guidelines",
        ),
        (
            PlantType.MIXED,
            GrowthStage.SPAWN_RUN,
            22,
            26,
            80,
            85,
            None,
            5000,
            14,
            21,
            "Moderate ranges",
        ),
        (
            PlantType.MIXED,
            GrowthStage.INCUBATION,
            20,
            24,
            85,
            90,
            None,
            2000,
            7,
            14,
            "Balanced approach",
        ),
        (
            PlantType.MIXED,
            GrowthStage.FRUITING,
            14,
            18,
            85,
            95,
            500,
            1200,
            5,
            10,
            "Moderate ventilation",
        ),
        (
            PlantType.MIXED,
            GrowthStage.HARVEST,
            15,
            20,
            70,
            80,
            None,
            None,
            1,
            3,
            "General harvest conditions",
        ),
        (
            PlantType.MIXED,
            GrowthStage.IDLE,
            None,
            None,
            None,
            None,
            None,
            None,
            None,
            None,
            "Room resting",
        ),
    ]

    count = 0
    for (
        plant_type,
        stage,
        t_min,
        t_max,
        h_min,
        h_max,
        c_min,
        c_max,
        d_min,
        d_max,
        notes,
    ) in guidelines_data:
        guideline = ClimateGuideline(
            plant_type=plant_type,
            growth_stage=stage,
            temp_min=t_min,
            temp_max=t_max,
            humidity_min=h_min,
            humidity_max=h_max,
            co2_min=c_min,
            co2_max=c_max,
            temp_hysteresis=1.0,
            humidity_hysteresis=2.5,
            co2_hysteresis=100,
            duration_days_min=d_min,
            duration_days_max=d_max,
            notes=notes,
            is_default=True,
        )
        db.add(guideline)
        count += 1

    await db.commit()
    print(f"Seeded {count} climate guidelines (4 plant types x 6 stages).")


if __name__ == "__main__":
    asyncio.run(seed())
