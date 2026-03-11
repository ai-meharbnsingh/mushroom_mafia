from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func as sa_func

from app.database import get_db
from app.models.harvest import Harvest
from app.models.room import Room
from app.models.plant import Plant
from app.models.user import User
from app.models.enums import UserRole, HarvestGrade
from app.schemas.harvest import HarvestCreate, HarvestResponse, HarvestSummary
from app.api.deps import get_current_user, require_roles

router = APIRouter()


async def _verify_room_ownership(
    db: AsyncSession, room_id: int, owner_id: int
) -> Room:
    """Verify a room belongs to the given owner. Return the room or raise 404/403."""
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
        select(Plant.owner_id)
        .where(Plant.plant_id == room.plant_id)
    )
    room_owner_id = ownership.scalar_one_or_none()
    if room_owner_id != owner_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not allowed to access this room",
        )
    return room


@router.post("/", response_model=HarvestResponse)
async def create_harvest(
    body: HarvestCreate,
    current_user: User = Depends(
        require_roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER, UserRole.OPERATOR)
    ),
    db: AsyncSession = Depends(get_db),
):
    """Log a new harvest entry."""
    await _verify_room_ownership(db, body.room_id, current_user.owner_id)

    # Validate grade
    try:
        grade = HarvestGrade(body.grade.upper())
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid grade: {body.grade}. Must be A, B, or C",
        )

    harvest = Harvest(
        room_id=body.room_id,
        harvested_at=body.harvested_at or datetime.now(timezone.utc),
        weight_kg=body.weight_kg,
        grade=grade,
        notes=body.notes,
        recorded_by=current_user.user_id,
    )
    db.add(harvest)
    await db.commit()
    await db.refresh(harvest)

    return harvest


@router.get("/room/{room_id}", response_model=list[HarvestResponse])
async def list_room_harvests(
    room_id: int,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List harvests for a specific room."""
    await _verify_room_ownership(db, room_id, current_user.owner_id)

    result = await db.execute(
        select(Harvest)
        .where(Harvest.room_id == room_id)
        .order_by(Harvest.harvested_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return result.scalars().all()


@router.get("/summary", response_model=list[HarvestSummary])
async def get_harvest_summary(
    period: str = Query("monthly", regex="^(monthly|weekly)$"),
    months: int = Query(3, ge=1, le=24),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get yield summary across all rooms the user owns, grouped by period."""
    # Get all room IDs belonging to this owner
    rooms_result = await db.execute(
        select(Room.room_id)
        .join(Plant, Room.plant_id == Plant.plant_id)
        .where(Plant.owner_id == current_user.owner_id)
    )
    room_ids = [row[0] for row in rooms_result.all()]

    if not room_ids:
        return []

    cutoff = datetime.now(timezone.utc) - timedelta(days=months * 30)

    return await _build_summary(db, room_ids, cutoff, period)


@router.get("/summary/room/{room_id}", response_model=list[HarvestSummary])
async def get_room_harvest_summary(
    room_id: int,
    period: str = Query("monthly", regex="^(monthly|weekly)$"),
    months: int = Query(3, ge=1, le=24),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get yield summary for a specific room, grouped by period."""
    await _verify_room_ownership(db, room_id, current_user.owner_id)

    cutoff = datetime.now(timezone.utc) - timedelta(days=months * 30)

    return await _build_summary(db, [room_id], cutoff, period)


async def _build_summary(
    db: AsyncSession,
    room_ids: list[int],
    cutoff: datetime,
    period: str,
) -> list[HarvestSummary]:
    """Build harvest summary grouped by period (monthly or weekly)."""
    # Fetch all harvests in the range
    result = await db.execute(
        select(Harvest)
        .where(
            Harvest.room_id.in_(room_ids),
            Harvest.harvested_at >= cutoff,
        )
        .order_by(Harvest.harvested_at.desc())
    )
    harvests = result.scalars().all()

    if not harvests:
        return []

    # Group by period
    buckets: dict[str, list] = {}
    for h in harvests:
        if period == "monthly":
            key = h.harvested_at.strftime("%Y-%m")
        else:  # weekly
            iso = h.harvested_at.isocalendar()
            key = f"{iso[0]}-W{iso[1]:02d}"
        buckets.setdefault(key, []).append(h)

    summaries = []
    for period_key, period_harvests in sorted(buckets.items(), reverse=True):
        total_weight = sum(Decimal(str(h.weight_kg)) for h in period_harvests)
        grade_breakdown: dict[str, int] = {}
        for h in period_harvests:
            grade_val = h.grade.value if hasattr(h.grade, "value") else str(h.grade)
            grade_breakdown[grade_val] = grade_breakdown.get(grade_val, 0) + 1

        summaries.append(
            HarvestSummary(
                total_weight_kg=total_weight,
                total_harvests=len(period_harvests),
                grade_breakdown=grade_breakdown,
                period=period_key,
            )
        )

    return summaries
