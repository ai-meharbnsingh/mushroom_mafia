from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.plant import Plant
from app.models.room import Room
from app.models.user import User
from app.models.enums import UserRole
from app.schemas.plant import PlantCreate, PlantUpdate, PlantResponse
from app.schemas.room import RoomResponse
from app.api.deps import get_current_user, require_roles

router = APIRouter()


@router.get("/", response_model=list[PlantResponse])
async def list_plants(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List plants filtered by owner_id from JWT."""
    result = await db.execute(
        select(Plant).where(
            Plant.owner_id == current_user.owner_id,
            Plant.is_active == True,
        )
    )
    return result.scalars().all()


@router.get("/{plant_id}", response_model=PlantResponse)
async def get_plant(
    plant_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get plant by ID. Owner check applied."""
    result = await db.execute(
        select(Plant).where(Plant.plant_id == plant_id, Plant.is_active == True)
    )
    plant = result.scalar_one_or_none()
    if not plant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Plant not found"
        )
    if plant.owner_id != current_user.owner_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not allowed to view this plant",
        )
    return plant


@router.post("/", response_model=PlantResponse, status_code=status.HTTP_201_CREATED)
async def create_plant(
    plant_in: PlantCreate,
    current_user: User = Depends(
        require_roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    ),
    db: AsyncSession = Depends(get_db),
):
    """Create a new plant. ADMIN+ only. owner_id set from current_user."""
    plant_data = plant_in.model_dump()
    # Override owner_id from the authenticated user
    plant_data["owner_id"] = current_user.owner_id
    plant = Plant(**plant_data)
    db.add(plant)
    await db.commit()
    await db.refresh(plant)
    return plant


@router.put("/{plant_id}", response_model=PlantResponse)
async def update_plant(
    plant_id: int,
    plant_in: PlantUpdate,
    current_user: User = Depends(
        require_roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    ),
    db: AsyncSession = Depends(get_db),
):
    """Update a plant. ADMIN+ only."""
    result = await db.execute(
        select(Plant).where(Plant.plant_id == plant_id, Plant.is_active == True)
    )
    plant = result.scalar_one_or_none()
    if not plant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Plant not found"
        )
    if plant.owner_id != current_user.owner_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not allowed to update this plant",
        )
    update_data = plant_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(plant, field, value)
    await db.commit()
    await db.refresh(plant)
    return plant


@router.delete("/{plant_id}", status_code=status.HTTP_200_OK)
async def delete_plant(
    plant_id: int,
    current_user: User = Depends(
        require_roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    ),
    db: AsyncSession = Depends(get_db),
):
    """Soft delete a plant. ADMIN+ only."""
    result = await db.execute(
        select(Plant).where(Plant.plant_id == plant_id, Plant.is_active == True)
    )
    plant = result.scalar_one_or_none()
    if not plant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Plant not found"
        )
    if plant.owner_id != current_user.owner_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not allowed to delete this plant",
        )
    plant.is_active = False
    await db.commit()
    return {"detail": "Plant deactivated"}


@router.get("/{plant_id}/rooms", response_model=list[RoomResponse])
async def get_plant_rooms(
    plant_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all rooms for a plant."""
    # First verify the plant exists and belongs to the user's owner
    plant_result = await db.execute(
        select(Plant).where(Plant.plant_id == plant_id, Plant.is_active == True)
    )
    plant = plant_result.scalar_one_or_none()
    if not plant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Plant not found"
        )
    if plant.owner_id != current_user.owner_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not allowed to view rooms for this plant",
        )
    result = await db.execute(
        select(Room).where(Room.plant_id == plant_id, Room.is_active == True)
    )
    return result.scalars().all()
