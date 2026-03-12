import secrets
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.config import settings
from app.api.deps import safe_rate_limit
from app.database import get_db
from app.schemas.auth import (
    LoginRequest,
    TokenResponse,
    RefreshRequest,
    ChangePasswordRequest,
)
from app.schemas.user import UserResponse
from app.services.auth_service import authenticate_user, create_tokens
from app.api.deps import get_current_user
from app.models.user import User
from app.utils.security import decode_token, hash_password, verify_password

router = APIRouter()


@router.post("/login", response_model=TokenResponse, dependencies=[Depends(safe_rate_limit(times=5, seconds=60))])
async def login(request: LoginRequest, response: Response, db: AsyncSession = Depends(get_db)):
    """Authenticate user and return access + refresh tokens."""
    user = await authenticate_user(db, request.username, request.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    tokens = create_tokens(user)
    csrf_token = secrets.token_urlsafe(32)
    response.set_cookie(key="access_token", value=tokens["access_token"], httponly=True, samesite=settings.cookie_samesite, secure=settings.cookie_secure, max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60)
    response.set_cookie(key="refresh_token", value=tokens["refresh_token"], httponly=True, samesite=settings.cookie_samesite, secure=settings.cookie_secure, max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60)
    response.set_cookie(key="csrf_token", value=csrf_token, httponly=False, samesite=settings.cookie_samesite, secure=settings.cookie_secure, max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60)
    return TokenResponse(
        access_token=tokens["access_token"],
        refresh_token=tokens["refresh_token"],
        user=UserResponse.model_validate(user),
    )


@router.post("/logout")
async def logout(response: Response, current_user: User = Depends(get_current_user)):
    """Logout current user (stateless acknowledgement)."""
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    response.delete_cookie("csrf_token")
    return {"detail": "Successfully logged out"}


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(request: Request, response: Response, body: RefreshRequest = None, db: AsyncSession = Depends(get_db)):
    """Validate refresh token and issue a new access token."""
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token and body:
        refresh_token = body.refresh_token
    if not refresh_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing refresh token")
    try:
        payload = decode_token(refresh_token)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    result = await db.execute(
        select(User).where(User.user_id == int(user_id), User.is_active == True)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    tokens = create_tokens(user)
    csrf_token = secrets.token_urlsafe(32)
    response.set_cookie(key="access_token", value=tokens["access_token"], httponly=True, samesite=settings.cookie_samesite, secure=settings.cookie_secure, max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60)
    response.set_cookie(key="refresh_token", value=tokens["refresh_token"], httponly=True, samesite=settings.cookie_samesite, secure=settings.cookie_secure, max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60)
    response.set_cookie(key="csrf_token", value=csrf_token, httponly=False, samesite=settings.cookie_samesite, secure=settings.cookie_secure, max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60)
    return TokenResponse(
        access_token=tokens["access_token"],
        refresh_token=tokens["refresh_token"],
        user=UserResponse.model_validate(user),
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Return current authenticated user's info."""
    return UserResponse.model_validate(current_user)


@router.post("/change-password")
async def change_password(
    request: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Change current user's password after validating old password."""
    if not verify_password(request.old_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Old password is incorrect",
        )

    current_user.password_hash = hash_password(request.new_password)
    await db.commit()
    return {"detail": "Password changed successfully"}
