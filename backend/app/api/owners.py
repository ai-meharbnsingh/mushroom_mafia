from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.owner import Owner
from app.models.user import User
from app.models.enums import UserRole
from app.schemas.owner import OwnerCreate, OwnerUpdate, OwnerResponse
from app.api.deps import get_current_user, require_roles

router = APIRouter()


@router.get("/", response_model=list[OwnerResponse])
async def list_owners(
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    """List all owners. SUPER_ADMIN only."""
    result = await db.execute(select(Owner).where(Owner.is_active == True))
    return result.scalars().all()


@router.get("/{owner_id}", response_model=OwnerResponse)
async def get_owner(
    owner_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get owner by ID. Any authenticated user can view their own owner."""
    result = await db.execute(
        select(Owner).where(Owner.owner_id == owner_id, Owner.is_active == True)
    )
    owner = result.scalar_one_or_none()
    if not owner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Owner not found"
        )
    # Non-super-admins can only view their own owner
    if current_user.role != UserRole.SUPER_ADMIN and current_user.owner_id != owner_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not allowed to view this owner",
        )
    return owner


@router.post("/", response_model=OwnerResponse, status_code=status.HTTP_201_CREATED)
async def create_owner(
    owner_in: OwnerCreate,
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    """Create a new owner. SUPER_ADMIN only."""
    owner = Owner(**owner_in.model_dump())
    db.add(owner)
    await db.commit()
    await db.refresh(owner)
    return owner


@router.put("/{owner_id}", response_model=OwnerResponse)
async def update_owner(
    owner_id: int,
    owner_in: OwnerUpdate,
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    """Update an owner. ADMIN+ only."""
    result = await db.execute(
        select(Owner).where(Owner.owner_id == owner_id, Owner.is_active == True)
    )
    owner = result.scalar_one_or_none()
    if not owner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Owner not found"
        )
    # Non-super-admins can only update their own owner
    if current_user.role != UserRole.SUPER_ADMIN and current_user.owner_id != owner_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not allowed to update this owner",
        )
    update_data = owner_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(owner, field, value)
    await db.commit()
    await db.refresh(owner)
    return owner
