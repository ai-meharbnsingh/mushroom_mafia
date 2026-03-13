"""
Climate Advisory Service — provides stage-aware climate recommendations
and auto-adjusts thresholds when growth stages advance.
"""

import logging
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import select
from app.utils.time import utcnow_naive
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.climate_guideline import ClimateGuideline
from app.models.growth_cycle import GrowthCycle
from app.models.room import Room
from app.models.plant import Plant
from app.models.threshold import Threshold
from app.models.alert import Alert
from app.models.enums import (
    PlantType,
    GrowthStage,
    ThresholdParameter,
    AlertType,
    Severity,
)
from app.schemas.climate_guideline import (
    ClimateGuidelineResponse,
    ClimateDeviationItem,
    ClimateAdvisoryResponse,
)

logger = logging.getLogger(__name__)

# Defines the allowed stage progression order (same as growth_cycles.py)
STAGE_ORDER = [
    GrowthStage.INOCULATION,
    GrowthStage.SPAWN_RUN,
    GrowthStage.INCUBATION,
    GrowthStage.FRUITING,
    GrowthStage.HARVEST,
    GrowthStage.IDLE,
]


async def _get_guideline(
    db: AsyncSession, plant_type: PlantType, growth_stage: GrowthStage
) -> ClimateGuideline | None:
    """Look up the climate guideline for a plant_type + growth_stage combo."""
    result = await db.execute(
        select(ClimateGuideline).where(
            ClimateGuideline.plant_type == plant_type,
            ClimateGuideline.growth_stage == growth_stage,
        )
    )
    return result.scalar_one_or_none()


def _get_next_stage(current_stage: GrowthStage) -> GrowthStage | None:
    """Return the next stage in the progression, or None if at final stage."""
    try:
        idx = STAGE_ORDER.index(current_stage)
        if idx < len(STAGE_ORDER) - 1:
            return STAGE_ORDER[idx + 1]
    except ValueError:
        pass
    return None


def _compute_deviation(
    parameter: str,
    current_min: Decimal | None,
    current_max: Decimal | None,
    guideline_min: Decimal | None,
    guideline_max: Decimal | None,
) -> ClimateDeviationItem:
    """Compare current threshold vs guideline and compute deviation."""
    # If guideline has no values for this parameter, it's OK
    if guideline_min is None and guideline_max is None:
        return ClimateDeviationItem(
            parameter=parameter,
            direction="ok",
            current_value=None,
            recommended_value=None,
            severity="ok",
        )

    # Check min side: is current min below recommended min?
    if guideline_min is not None and current_min is not None:
        if current_min < guideline_min:
            diff = abs(float(guideline_min - current_min))
            threshold_val = float(guideline_min) * 0.20 if float(guideline_min) != 0 else 5.0
            severity = "critical" if diff > threshold_val else "warning"
            return ClimateDeviationItem(
                parameter=parameter,
                direction="too_low",
                current_value=current_min,
                recommended_value=guideline_min,
                severity=severity,
            )

    # Check max side: is current max above recommended max?
    if guideline_max is not None and current_max is not None:
        if current_max > guideline_max:
            diff = abs(float(current_max - guideline_max))
            threshold_val = float(guideline_max) * 0.20 if float(guideline_max) != 0 else 5.0
            severity = "critical" if diff > threshold_val else "warning"
            return ClimateDeviationItem(
                parameter=parameter,
                direction="too_high",
                current_value=current_max,
                recommended_value=guideline_max,
                severity=severity,
            )

    return ClimateDeviationItem(
        parameter=parameter,
        direction="ok",
        current_value=current_max or current_min,
        recommended_value=guideline_max or guideline_min,
        severity="ok",
    )


async def get_advisory_for_room(
    db: AsyncSession, room_id: int, owner_id: int
) -> ClimateAdvisoryResponse:
    """Generate a full climate advisory for a room."""
    # 1. Get active growth cycle for room
    cycle_result = await db.execute(
        select(GrowthCycle).where(
            GrowthCycle.room_id == room_id,
            GrowthCycle.is_active == True,
        )
    )
    cycle = cycle_result.scalar_one_or_none()

    if not cycle:
        return ClimateAdvisoryResponse(
            room_id=room_id,
            suggestions=["Start a growth cycle to get climate recommendations."],
        )

    # 2. Get room -> plant -> plant_type
    room_result = await db.execute(
        select(Room).options(selectinload(Room.plant)).where(Room.room_id == room_id)
    )
    room = room_result.scalar_one_or_none()
    if not room or not room.plant:
        return ClimateAdvisoryResponse(
            room_id=room_id,
            current_stage=cycle.current_stage.value if cycle.current_stage else None,
            suggestions=["Room or plant configuration is missing."],
        )

    plant_type = room.plant.plant_type

    # 3. Look up climate guideline for (plant_type, current_stage)
    guideline = await _get_guideline(db, plant_type, cycle.current_stage)

    # 4. Get current thresholds for room
    thresh_result = await db.execute(
        select(Threshold).where(Threshold.room_id == room_id)
    )
    thresholds = thresh_result.scalars().all()

    current_thresholds = {}
    for t in thresholds:
        param = t.parameter.value
        current_thresholds[param] = {
            "min_value": float(t.min_value) if t.min_value is not None else None,
            "max_value": float(t.max_value) if t.max_value is not None else None,
            "hysteresis": float(t.hysteresis) if t.hysteresis is not None else None,
        }

    # 5. Compute deviations
    deviations = []
    if guideline:
        # Map parameter names to guideline fields
        param_map = {
            "TEMPERATURE": ("temp_min", "temp_max"),
            "HUMIDITY": ("humidity_min", "humidity_max"),
            "CO2": ("co2_min", "co2_max"),
        }
        for param_name, (g_min_field, g_max_field) in param_map.items():
            g_min = getattr(guideline, g_min_field, None)
            g_max = getattr(guideline, g_max_field, None)
            c_min = None
            c_max = None
            if param_name in current_thresholds:
                c_min_raw = current_thresholds[param_name]["min_value"]
                c_max_raw = current_thresholds[param_name]["max_value"]
                c_min = Decimal(str(c_min_raw)) if c_min_raw is not None else None
                c_max = Decimal(str(c_max_raw)) if c_max_raw is not None else None

            deviation = _compute_deviation(param_name, c_min, c_max, g_min, g_max)
            deviations.append(deviation)

    # 6. Compute days_in_stage
    now = utcnow_naive()
    if cycle.stage_changed_at:
        days_in_stage = (now - cycle.stage_changed_at).days
    else:
        days_in_stage = (now - cycle.started_at).days

    # 7. Generate transition_reminder
    transition_reminder = None
    stage_duration_min = guideline.duration_days_min if guideline else None
    stage_duration_max = guideline.duration_days_max if guideline else None

    if guideline and guideline.duration_days_min is not None:
        if days_in_stage >= guideline.duration_days_min:
            next_stage = _get_next_stage(cycle.current_stage)
            next_name = next_stage.value if next_stage else "completion"
            duration_range = f"{guideline.duration_days_min}-{guideline.duration_days_max}" if guideline.duration_days_max else str(guideline.duration_days_min)
            transition_reminder = (
                f"{cycle.current_stage.value} phase ending soon "
                f"(Day {days_in_stage} of {duration_range} days). "
                f"Next: {next_name}"
            )

    # 8. Look up next stage guideline for preview
    next_stage = _get_next_stage(cycle.current_stage)
    next_stage_preview = None
    if next_stage:
        next_guideline = await _get_guideline(db, plant_type, next_stage)
        if next_guideline:
            next_stage_preview = ClimateGuidelineResponse.model_validate(next_guideline)

    # 9. Generate suggestions
    suggestions = []
    if guideline:
        stage_name = cycle.current_stage.value
        for dev in deviations:
            if dev.direction == "too_high":
                if dev.parameter == "CO2":
                    suggestions.append(
                        f"CO2 threshold ({dev.current_value}) is above recommended "
                        f"({dev.recommended_value}) for {stage_name}. "
                        f"High CO2 causes elongated stems and poor cap development."
                    )
                elif dev.parameter == "TEMPERATURE":
                    suggestions.append(
                        f"Temperature threshold ({dev.current_value}) is above recommended "
                        f"({dev.recommended_value}) for {stage_name}. "
                        f"High temperatures can cause contamination and poor yields."
                    )
                elif dev.parameter == "HUMIDITY":
                    suggestions.append(
                        f"Humidity threshold ({dev.current_value}) is above recommended "
                        f"({dev.recommended_value}) for {stage_name}. "
                        f"Excessive humidity increases risk of bacterial blotch."
                    )
            elif dev.direction == "too_low":
                if dev.parameter == "CO2":
                    suggestions.append(
                        f"CO2 threshold ({dev.current_value}) is below recommended "
                        f"({dev.recommended_value}) for {stage_name}. "
                        f"Verify ventilation settings."
                    )
                elif dev.parameter == "TEMPERATURE":
                    suggestions.append(
                        f"Temperature threshold ({dev.current_value}) is below recommended "
                        f"({dev.recommended_value}) for {stage_name}. "
                        f"Low temperatures slow growth and delay fruiting."
                    )
                elif dev.parameter == "HUMIDITY":
                    suggestions.append(
                        f"Humidity threshold ({dev.current_value}) is below recommended "
                        f"({dev.recommended_value}) for {stage_name}. "
                        f"Low humidity causes caps to crack and dry out."
                    )

        if transition_reminder and next_stage:
            if next_stage_preview:
                suggestions.append(
                    f"Consider advancing to {next_stage.value}. "
                    f"Recommended ranges will change to: "
                    f"Temp {next_stage_preview.temp_min}-{next_stage_preview.temp_max}°C, "
                    f"Humidity {next_stage_preview.humidity_min}-{next_stage_preview.humidity_max}%, "
                    f"CO2 {next_stage_preview.co2_min}-{next_stage_preview.co2_max} ppm."
                )
            else:
                suggestions.append(
                    f"Consider advancing to {next_stage.value}."
                )
    else:
        suggestions.append(
            f"No climate guideline found for {plant_type.value} at "
            f"{cycle.current_stage.value} stage."
        )

    recommended = None
    if guideline:
        recommended = ClimateGuidelineResponse.model_validate(guideline)

    return ClimateAdvisoryResponse(
        room_id=room_id,
        current_stage=cycle.current_stage.value,
        plant_type=plant_type.value,
        recommended=recommended,
        current_thresholds=current_thresholds,
        deviations=deviations,
        days_in_stage=days_in_stage,
        stage_duration_min=stage_duration_min,
        stage_duration_max=stage_duration_max,
        transition_reminder=transition_reminder,
        next_stage=next_stage.value if next_stage else None,
        next_stage_preview=next_stage_preview,
        auto_adjust_enabled=cycle.auto_adjust_thresholds if cycle.auto_adjust_thresholds is not None else True,
        suggestions=suggestions,
    )


async def apply_guideline_thresholds(
    db: AsyncSession, room_id: int, guideline: ClimateGuideline, user_id: int
) -> list[Threshold]:
    """Apply a guideline's recommended ranges to the room's thresholds."""
    # Map guideline fields to ThresholdParameter
    param_mapping = {
        ThresholdParameter.TEMPERATURE: {
            "min": guideline.temp_min,
            "max": guideline.temp_max,
            "hysteresis": guideline.temp_hysteresis,
        },
        ThresholdParameter.HUMIDITY: {
            "min": guideline.humidity_min,
            "max": guideline.humidity_max,
            "hysteresis": guideline.humidity_hysteresis,
        },
        ThresholdParameter.CO2: {
            "min": guideline.co2_min,
            "max": guideline.co2_max,
            "hysteresis": guideline.co2_hysteresis,
        },
    }

    updated_thresholds = []
    for param, values in param_mapping.items():
        # Only update if guideline has values for this parameter
        if values["min"] is None and values["max"] is None:
            continue

        result = await db.execute(
            select(Threshold).where(
                Threshold.room_id == room_id,
                Threshold.parameter == param,
            )
        )
        threshold = result.scalar_one_or_none()

        if threshold:
            if values["min"] is not None:
                threshold.min_value = values["min"]
            if values["max"] is not None:
                threshold.max_value = values["max"]
            if values["hysteresis"] is not None:
                threshold.hysteresis = values["hysteresis"]
            threshold.updated_by = user_id
            updated_thresholds.append(threshold)

    await db.commit()
    for t in updated_thresholds:
        await db.refresh(t)

    return updated_thresholds


async def _publish_thresholds_to_devices(
    db: AsyncSession, room_id: int, mqtt_manager
) -> None:
    """Publish updated threshold config to all online devices in a room.

    Reuses the same pattern from thresholds.py router.
    """
    room_with_devices = await db.execute(
        select(Room)
        .options(selectinload(Room.devices))
        .where(Room.room_id == room_id)
    )
    room_obj = room_with_devices.scalar_one_or_none()
    if not room_obj or not room_obj.devices:
        return

    # Build config payload from all thresholds for this room
    all_thresholds = await db.execute(
        select(Threshold).where(Threshold.room_id == room_id)
    )
    config_payload = {}
    for th in all_thresholds.scalars().all():
        param = th.parameter.value.lower()  # CO2, HUMIDITY, TEMPERATURE
        if th.min_value is not None:
            config_payload[f"{param}_min"] = float(th.min_value)
        if th.max_value is not None:
            config_payload[f"{param}_max"] = float(th.max_value)
        if th.hysteresis is not None:
            config_payload[f"{param}_hysteresis"] = float(th.hysteresis)

    for device in room_obj.devices:
        if device.is_online and device.license_key:
            await mqtt_manager.publish_config_update(
                device.license_key, config_payload
            )

    logger.info(
        "Threshold config synced to %d device(s) in room %d after stage advance",
        len([d for d in room_obj.devices if d.is_online]),
        room_id,
    )


async def on_stage_advanced(
    db: AsyncSession,
    redis,
    room_id: int,
    new_stage: GrowthStage,
    cycle: GrowthCycle,
    mqtt_manager,
    ws_manager,
) -> None:
    """Called after a growth cycle stage is advanced.

    If auto_adjust_thresholds is enabled, applies the guideline thresholds
    for the new stage and syncs to devices via MQTT.
    """
    try:
        if not cycle.auto_adjust_thresholds:
            logger.info(
                "Auto-adjust disabled for cycle %d, skipping threshold update",
                cycle.cycle_id,
            )
            return

        # Get room -> plant -> plant_type
        room_result = await db.execute(
            select(Room).options(selectinload(Room.plant)).where(Room.room_id == room_id)
        )
        room = room_result.scalar_one_or_none()
        if not room or not room.plant:
            logger.warning("Room %d or its plant not found for advisory", room_id)
            return

        plant_type = room.plant.plant_type

        # Look up guideline for (plant_type, new_stage)
        guideline = await _get_guideline(db, plant_type, new_stage)
        if not guideline:
            logger.info(
                "No guideline found for %s/%s, skipping auto-adjust",
                plant_type.value,
                new_stage.value,
            )
            return

        # Apply guideline thresholds
        updated = await apply_guideline_thresholds(
            db, room_id, guideline, cycle.created_by
        )
        logger.info(
            "Auto-adjusted %d threshold(s) for room %d to %s stage guidelines",
            len(updated),
            room_id,
            new_stage.value,
        )

        # Publish updated thresholds to all devices in room via MQTT
        try:
            await _publish_thresholds_to_devices(db, room_id, mqtt_manager)
        except Exception as e:
            logger.error(
                "Failed to publish threshold config via MQTT after stage advance: %s", e
            )

        # Broadcast WebSocket event
        try:
            # Get owner_id from plant
            owner_id = room.plant.owner_id
            await ws_manager.broadcast_to_owner(
                owner_id,
                "stage_advanced",
                {
                    "room_id": room_id,
                    "room_name": room.room_name,
                    "new_stage": new_stage.value,
                    "cycle_id": cycle.cycle_id,
                    "auto_adjusted": True,
                    "thresholds_updated": len(updated),
                },
            )
        except Exception as e:
            logger.error("Failed to broadcast stage_advanced WebSocket event: %s", e)

    except Exception as e:
        logger.error(
            "Error in on_stage_advanced for room %d: %s", room_id, e
        )
