from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.alert import Alert
from app.models.device import Device
from app.models.room import Room
from app.models.plant import Plant
from app.models.user import User
from app.models.enums import UserRole
from app.schemas.alert import AlertResponse
from app.api.deps import get_current_user, require_roles

router = APIRouter()


def _owner_filtered_alerts_query(current_user: User):
    """Base query for alerts filtered by owner via device->room->plant chain and assigned plants."""
    conditions = [Plant.owner_id == current_user.owner_id]
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.ADMIN]:
        if not current_user.assigned_plants:
            # If no assigned plants, ensure query returns nothing
            conditions.append(False)
        else:
            assigned_ids = [int(pid) for pid in current_user.assigned_plants]
            conditions.append(Plant.plant_id.in_(assigned_ids))

    return (
        select(Alert)
        .join(Device, Alert.device_id == Device.device_id)
        .join(Room, Alert.room_id == Room.room_id)
        .join(Plant, Room.plant_id == Plant.plant_id)
        .where(*conditions)
    )


@router.get("/", response_model=list[AlertResponse])
async def list_alerts(
    severity: Optional[str] = Query(None, description="Filter by severity"),
    is_resolved: Optional[bool] = Query(None, description="Filter by resolved status"),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List alerts filtered by owner via device->room->plant chain.
    Supports query params: severity, is_resolved, limit, offset."""
    query = _owner_filtered_alerts_query(current_user)
    if severity is not None:
        query = query.where(Alert.severity == severity)
    if is_resolved is not None:
        query = query.where(Alert.is_resolved == is_resolved)
    query = query.order_by(Alert.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/active", response_model=list[AlertResponse])
async def list_active_alerts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List unresolved alerts."""
    query = _owner_filtered_alerts_query(current_user).where(
        Alert.is_resolved == False
    )
    query = query.order_by(Alert.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{alert_id}", response_model=AlertResponse)
async def get_alert(
    alert_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get alert by ID."""
    query = _owner_filtered_alerts_query(current_user).where(
        Alert.alert_id == alert_id
    )
    result = await db.execute(query)
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found"
        )
    return alert


@router.post("/{alert_id}/acknowledge", response_model=AlertResponse)
async def acknowledge_alert(
    alert_id: int,
    current_user: User = Depends(
        require_roles(
            UserRole.OPERATOR,
            UserRole.MANAGER,
            UserRole.ADMIN,
            UserRole.SUPER_ADMIN,
        )
    ),
    db: AsyncSession = Depends(get_db),
):
    """Acknowledge an alert. Set is_read=True, acknowledged_by, acknowledged_at. OPERATOR+ role."""
    query = _owner_filtered_alerts_query(current_user).where(
        Alert.alert_id == alert_id
    )
    result = await db.execute(query)
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found"
        )
    alert.is_read = True
    alert.acknowledged_by = current_user.user_id
    alert.acknowledged_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(alert)
    return alert


@router.post("/{alert_id}/resolve", response_model=AlertResponse)
async def resolve_alert(
    alert_id: int,
    current_user: User = Depends(
        require_roles(
            UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN
        )
    ),
    db: AsyncSession = Depends(get_db),
):
    """Resolve an alert. Set is_resolved=True, resolved_at=now. MANAGER+ role."""
    query = _owner_filtered_alerts_query(current_user).where(
        Alert.alert_id == alert_id
    )
    result = await db.execute(query)
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found"
        )
    alert.is_resolved = True
    alert.resolved_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(alert)
    return alert
