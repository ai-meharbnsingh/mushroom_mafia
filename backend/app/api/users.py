from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.user import User
from app.models.enums import UserRole
from app.schemas.user import UserCreate, UserUpdate, UserResponse
from app.api.deps import get_current_user, require_roles
from app.utils.security import hash_password

router = APIRouter()


@router.get("/", response_model=list[UserResponse])
async def list_users(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List users. SUPER_ADMIN sees all org users. Others see only users sharing their plants."""
    if current_user.role == UserRole.SUPER_ADMIN:
        result = await db.execute(
            select(User).where(
                User.owner_id == current_user.owner_id,
                User.is_active == True,
            )
        )
        return result.scalars().all()

    # Non-super-admin: fetch all org users, then filter to those sharing assigned plants
    my_plants = set(int(pid) for pid in (current_user.assigned_plants or []))
    if not my_plants:
        return [current_user]  # At minimum, see yourself

    result = await db.execute(
        select(User).where(
            User.owner_id == current_user.owner_id,
            User.is_active == True,
        )
    )
    all_users = result.scalars().all()
    filtered = []
    for u in all_users:
        if u.user_id == current_user.user_id:
            filtered.append(u)
            continue
        their_plants = set(int(pid) for pid in (u.assigned_plants or []))
        if my_plants & their_plants:  # Intersection — shares at least one plant
            filtered.append(u)
    return filtered


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get user by ID. Must belong to same owner."""
    result = await db.execute(
        select(User).where(User.user_id == user_id, User.is_active == True)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )
    if user.owner_id != current_user.owner_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not allowed to view this user",
        )
    return user


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_in: UserCreate,
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    """Create a new user. ADMIN+ only. Hash password before saving."""
    user_data = user_in.model_dump()
    # Hash the password
    user_data["password_hash"] = hash_password(user_data.pop("password"))
    # Force owner_id to current user's owner for non-super-admins
    if current_user.role != UserRole.SUPER_ADMIN:
        user_data["owner_id"] = current_user.owner_id
    user = User(**user_data)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_in: UserUpdate,
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    """Update a user. ADMIN+ only. Hash password if provided."""
    result = await db.execute(
        select(User).where(User.user_id == user_id, User.is_active == True)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )
    # Non-super-admins can only manage users within their own owner
    if (
        current_user.role != UserRole.SUPER_ADMIN
        and user.owner_id != current_user.owner_id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not allowed to update this user",
        )
    update_data = user_in.model_dump(exclude_unset=True)
    # Hash the password if provided
    if "password" in update_data:
        update_data["password_hash"] = hash_password(update_data.pop("password"))
    for field, value in update_data.items():
        setattr(user, field, value)
    await db.commit()
    await db.refresh(user)
    return user


@router.post("/{user_id}/unlock", status_code=status.HTTP_200_OK)
async def unlock_user(
    user_id: int,
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    """Unlock a locked user account. ADMIN+ only. Resets login attempts and lockout."""
    result = await db.execute(
        select(User).where(User.user_id == user_id, User.is_active == True)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )
    if (
        current_user.role != UserRole.SUPER_ADMIN
        and user.owner_id != current_user.owner_id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not allowed to manage this user",
        )
    user.login_attempts = 0
    user.locked_until = None
    await db.commit()
    return {"detail": f"User '{user.username}' has been unlocked"}


@router.delete("/{user_id}", status_code=status.HTTP_200_OK)
async def delete_user(
    user_id: int,
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    """Soft delete a user (set is_active=False). ADMIN+ only."""
    result = await db.execute(
        select(User).where(User.user_id == user_id, User.is_active == True)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )
    # Non-super-admins can only manage users within their own owner
    if (
        current_user.role != UserRole.SUPER_ADMIN
        and user.owner_id != current_user.owner_id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not allowed to delete this user",
        )
    user.is_active = False
    await db.commit()
    return {"detail": "User deactivated"}
