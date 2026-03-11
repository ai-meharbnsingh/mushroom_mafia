from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

import logging

from app.database import get_db
from app.models.growth_cycle import GrowthCycle
from app.models.room import Room
from app.models.plant import Plant
from app.models.user import User
from app.models.enums import UserRole, GrowthStage
from app.schemas.harvest import GrowthCycleCreate, GrowthCycleUpdate, GrowthCycleResponse
from app.api.deps import get_current_user, require_roles
from app.services.climate_advisory import on_stage_advanced
from app.services.mqtt_client import mqtt_manager
from app.services.ws_manager import ws_manager
from app.redis_client import redis_client

logger = logging.getLogger(__name__)

router = APIRouter()

# Defines the allowed stage progression order
STAGE_ORDER = [
    GrowthStage.INOCULATION,
    GrowthStage.SPAWN_RUN,
    GrowthStage.INCUBATION,
    GrowthStage.FRUITING,
    GrowthStage.HARVEST,
    GrowthStage.IDLE,
]


async def _verify_room_ownership(
    db: AsyncSession, room_id: int, owner_id: int
) -> Room:
    """Verify a room belongs to the given owner."""
    result = await db.execute(
        select(Room)
        .join(Plant, Room.plant_id == Plant.plant_id)
        .where(Room.room_id == room_id)
    )
    room = result.scalar_one_or_none()
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Room not found"
        )

    ownership = await db.execute(
        select(Plant.owner_id).where(Plant.plant_id == room.plant_id)
    )
    room_owner_id = ownership.scalar_one_or_none()
    if room_owner_id != owner_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not allowed to access this room",
        )
    return room


@router.post("/", response_model=GrowthCycleResponse)
async def create_growth_cycle(
    body: GrowthCycleCreate,
    current_user: User = Depends(
        require_roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
    ),
    db: AsyncSession = Depends(get_db),
):
    """Start a new growth cycle for a room. Auto-deactivates any existing active cycle."""
    await _verify_room_ownership(db, body.room_id, current_user.owner_id)

    # Validate stage
    try:
        stage = GrowthStage(body.current_stage.upper())
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid stage: {body.current_stage}",
        )

    # Deactivate any existing active cycle for this room
    active_result = await db.execute(
        select(GrowthCycle).where(
            GrowthCycle.room_id == body.room_id,
            GrowthCycle.is_active == True,
        )
    )
    for active_cycle in active_result.scalars().all():
        active_cycle.is_active = False
        active_cycle.updated_at = datetime.now(timezone.utc)

    cycle = GrowthCycle(
        room_id=body.room_id,
        started_at=body.started_at or datetime.now(timezone.utc),
        current_stage=stage,
        expected_harvest_date=body.expected_harvest_date,
        target_yield_kg=body.target_yield_kg,
        notes=body.notes,
        auto_adjust_thresholds=body.auto_adjust_thresholds if body.auto_adjust_thresholds is not None else True,
        created_by=current_user.user_id,
        is_active=True,
    )
    db.add(cycle)
    await db.commit()
    await db.refresh(cycle)

    return cycle


@router.put("/{cycle_id}/advance", response_model=GrowthCycleResponse)
async def advance_growth_stage(
    cycle_id: int,
    body: GrowthCycleUpdate = None,
    current_user: User = Depends(
        require_roles(
            UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER, UserRole.OPERATOR
        )
    ),
    db: AsyncSession = Depends(get_db),
):
    """Advance a growth cycle to the next stage (or a specified stage).

    If body.current_stage is provided, jump to that stage.
    Otherwise, advance to the next stage in the sequence.
    Also updates optional fields if provided.
    """
    result = await db.execute(
        select(GrowthCycle).where(GrowthCycle.cycle_id == cycle_id)
    )
    cycle = result.scalar_one_or_none()
    if not cycle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Growth cycle not found"
        )

    await _verify_room_ownership(db, cycle.room_id, current_user.owner_id)

    if not cycle.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot advance an inactive cycle",
        )

    now = datetime.now(timezone.utc)

    if body and body.current_stage:
        # Jump to specified stage
        try:
            new_stage = GrowthStage(body.current_stage.upper())
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid stage: {body.current_stage}",
            )
        cycle.current_stage = new_stage
    else:
        # Advance to next stage
        current_idx = STAGE_ORDER.index(cycle.current_stage)
        if current_idx >= len(STAGE_ORDER) - 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cycle is already at final stage: {cycle.current_stage.value}",
            )
        cycle.current_stage = STAGE_ORDER[current_idx + 1]

    cycle.stage_changed_at = now
    cycle.updated_at = now

    # Apply optional field updates
    if body:
        if body.expected_harvest_date is not None:
            cycle.expected_harvest_date = body.expected_harvest_date
        if body.target_yield_kg is not None:
            cycle.target_yield_kg = body.target_yield_kg
        if body.notes is not None:
            cycle.notes = body.notes
        if body.auto_adjust_thresholds is not None:
            cycle.auto_adjust_thresholds = body.auto_adjust_thresholds

    await db.commit()
    await db.refresh(cycle)

    # Trigger climate advisory auto-adjust after stage advancement
    try:
        await on_stage_advanced(
            db=db,
            redis=redis_client,
            room_id=cycle.room_id,
            new_stage=cycle.current_stage,
            cycle=cycle,
            mqtt_manager=mqtt_manager,
            ws_manager=ws_manager,
        )
    except Exception as e:
        logger.error(
            "Climate advisory on_stage_advanced failed for cycle %d: %s",
            cycle.cycle_id,
            e,
        )

    return cycle


@router.get("/room/{room_id}/current", response_model=GrowthCycleResponse)
async def get_current_cycle(
    room_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the current active growth cycle for a room."""
    await _verify_room_ownership(db, room_id, current_user.owner_id)

    result = await db.execute(
        select(GrowthCycle).where(
            GrowthCycle.room_id == room_id,
            GrowthCycle.is_active == True,
        )
    )
    cycle = result.scalar_one_or_none()
    if not cycle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active growth cycle for this room",
        )

    return cycle


@router.get("/room/{room_id}", response_model=list[GrowthCycleResponse])
async def list_room_cycles(
    room_id: int,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all growth cycles for a room, newest first."""
    await _verify_room_ownership(db, room_id, current_user.owner_id)

    result = await db.execute(
        select(GrowthCycle)
        .where(GrowthCycle.room_id == room_id)
        .order_by(GrowthCycle.started_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return result.scalars().all()
