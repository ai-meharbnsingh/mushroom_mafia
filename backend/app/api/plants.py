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
from app.utils.security import hash_password

router = APIRouter()


@router.get("/", response_model=list[PlantResponse], summary="List all plants for the current user")
async def list_plants(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List plants filtered by owner_id from JWT."""
    conditions = [Plant.owner_id == current_user.owner_id, Plant.is_active == True]
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.ADMIN]:
        if not current_user.assigned_plants:
            return []
        assigned_ids = [int(pid) for pid in current_user.assigned_plants]
        conditions.append(Plant.plant_id.in_(assigned_ids))

    result = await db.execute(select(Plant).where(*conditions))
    return result.scalars().all()


@router.get("/{plant_id}", response_model=PlantResponse, summary="Get a plant by ID")
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

    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.ADMIN]:
        assigned_ids = [int(pid) for pid in (current_user.assigned_plants or [])]
        if plant.plant_id not in assigned_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not allowed to view this plant",
            )

    if plant.owner_id != current_user.owner_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not allowed to view this plant",
        )
    return plant


@router.post("/", response_model=PlantResponse, status_code=status.HTTP_201_CREATED, summary="Create a new plant with admin attachment")
async def create_plant(
    plant_in: PlantCreate,
    current_user: User = Depends(
        require_roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    ),
    db: AsyncSession = Depends(get_db),
):
    """Create a new plant with mandatory admin attachment. ADMIN+ only."""
    plant_data = plant_in.model_dump(exclude={"admin_user_id", "new_admin"})
    plant_data["owner_id"] = current_user.owner_id
    plant = Plant(**plant_data)
    db.add(plant)
    await db.flush()

    if plant_in.admin_user_id:
        result = await db.execute(
            select(User).where(User.user_id == plant_in.admin_user_id, User.is_active == True)
        )
        admin_user = result.scalar_one_or_none()
        if not admin_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Admin user not found"
            )
        if admin_user.owner_id != current_user.owner_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin user does not belong to your organization",
            )
        if admin_user.role not in (UserRole.ADMIN, UserRole.SUPER_ADMIN):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Selected user must have ADMIN or SUPER_ADMIN role",
            )
        existing = admin_user.assigned_plants or []
        admin_user.assigned_plants = existing + [plant.plant_id]
    elif plant_in.new_admin:
        new_user = User(
            owner_id=current_user.owner_id,
            role=UserRole.ADMIN,
            password_hash=hash_password(plant_in.new_admin.password),
            username=plant_in.new_admin.username,
            email=plant_in.new_admin.email,
            first_name=plant_in.new_admin.first_name,
            last_name=plant_in.new_admin.last_name,
            mobile=plant_in.new_admin.mobile,
            assigned_plants=[plant.plant_id],
        )
        db.add(new_user)

    await db.commit()
    await db.refresh(plant)
    return plant


@router.put("/{plant_id}", response_model=PlantResponse, summary="Update a plant")
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


@router.delete("/{plant_id}", status_code=status.HTTP_200_OK, summary="Soft-delete a plant")
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


@router.get("/{plant_id}/rooms", response_model=list[RoomResponse], summary="List rooms for a plant")
async def get_plant_rooms(
    plant_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all rooms for a plant."""
    plant_result = await db.execute(
        select(Plant).where(Plant.plant_id == plant_id, Plant.is_active == True)
    )
    plant = plant_result.scalar_one_or_none()
    if not plant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Plant not found"
        )

    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.ADMIN]:
        assigned_ids = [int(pid) for pid in (current_user.assigned_plants or [])]
        if plant.plant_id not in assigned_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not allowed to view rooms for this plant",
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
