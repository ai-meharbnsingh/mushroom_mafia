from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.room import Room
from app.models.plant import Plant
from app.models.user import User
from app.models.enums import UserRole, RoomStatus
from app.schemas.room import RoomCreate, RoomUpdate, RoomResponse, RoomStatusChange
from app.api.deps import get_current_user, require_roles

router = APIRouter()


@router.get("/", response_model=list[RoomResponse], summary="List all rooms for the current user")
async def list_rooms(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List rooms. Join with plants to filter by owner_id."""
    conditions = [Plant.owner_id == current_user.owner_id, Room.is_active == True]
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.ADMIN]:
        if not current_user.assigned_plants:
            return []
        assigned_ids = [int(pid) for pid in current_user.assigned_plants]
        conditions.append(Plant.plant_id.in_(assigned_ids))

    result = await db.execute(
        select(Room)
        .join(Plant, Room.plant_id == Plant.plant_id)
        .where(*conditions)
    )
    return result.scalars().all()


@router.get("/{room_id}", response_model=RoomResponse, summary="Get a room by ID")
async def get_room(
    room_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get room by ID. Owner check via plant."""
    result = await db.execute(
        select(Room)
        .join(Plant, Room.plant_id == Plant.plant_id)
        .where(
            Room.room_id == room_id,
            Room.is_active == True,
            Plant.owner_id == current_user.owner_id,
        )
    )
    room = result.scalar_one_or_none()
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Room not found"
        )
    return room


@router.post("/", response_model=RoomResponse, status_code=status.HTTP_201_CREATED, summary="Create a new room in a plant")
async def create_room(
    room_in: RoomCreate,
    current_user: User = Depends(
        require_roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
    ),
    db: AsyncSession = Depends(get_db),
):
    """Create a room. ADMIN/MANAGER. Verify plant belongs to owner."""
    plant_result = await db.execute(
        select(Plant).where(
            Plant.plant_id == room_in.plant_id, Plant.is_active == True
        )
    )
    plant = plant_result.scalar_one_or_none()
    if not plant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Plant not found"
        )
    if plant.owner_id != current_user.owner_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Plant does not belong to your organization",
        )
    room = Room(**room_in.model_dump())
    db.add(room)
    await db.commit()
    await db.refresh(room)
    return room


@router.put("/{room_id}", response_model=RoomResponse, summary="Update a room")
async def update_room(
    room_id: int,
    room_in: RoomUpdate,
    current_user: User = Depends(
        require_roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
    ),
    db: AsyncSession = Depends(get_db),
):
    """Update a room. ADMIN/MANAGER."""
    result = await db.execute(
        select(Room)
        .join(Plant, Room.plant_id == Plant.plant_id)
        .where(
            Room.room_id == room_id,
            Room.is_active == True,
            Plant.owner_id == current_user.owner_id,
        )
    )
    room = result.scalar_one_or_none()
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Room not found"
        )
    update_data = room_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(room, field, value)
    await db.commit()
    await db.refresh(room)
    return room


@router.patch("/{room_id}/status", response_model=RoomResponse, summary="Change room status")
async def change_room_status(
    room_id: int,
    status_in: RoomStatusChange,
    current_user: User = Depends(
        require_roles(UserRole.SUPER_ADMIN)
    ),
    db: AsyncSession = Depends(get_db),
):
    """Change room status. SUPER_ADMIN only."""
    result = await db.execute(
        select(Room)
        .join(Plant, Room.plant_id == Plant.plant_id)
        .where(
            Room.room_id == room_id,
            Room.is_active == True,
            Plant.owner_id == current_user.owner_id,
        )
    )
    room = result.scalar_one_or_none()
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Room not found"
        )
    room.status = RoomStatus(status_in.status)
    await db.commit()
    await db.refresh(room)
    return room


@router.delete("/{room_id}", status_code=status.HTTP_200_OK, summary="Soft-delete a room")
async def delete_room(
    room_id: int,
    current_user: User = Depends(
        require_roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    ),
    db: AsyncSession = Depends(get_db),
):
    """Soft delete a room. ADMIN+ only."""
    result = await db.execute(
        select(Room)
        .join(Plant, Room.plant_id == Plant.plant_id)
        .where(
            Room.room_id == room_id,
            Room.is_active == True,
            Plant.owner_id == current_user.owner_id,
        )
    )
    room = result.scalar_one_or_none()
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Room not found"
        )
    room.is_active = False
    await db.commit()
    return {"detail": "Room deactivated"}
