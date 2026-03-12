from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api.deps import safe_rate_limit
from app.database import get_db
from app.models.inquiry import ContactInquiry, InquiryType
from app.models.user import User
from app.models.enums import UserRole
from app.schemas.inquiry import InquiryCreate, InquiryResponse
from app.api.deps import require_roles

router = APIRouter()


@router.post(
    "/",
    response_model=InquiryResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(safe_rate_limit(times=5, seconds=60))],
)
async def create_inquiry(
    body: InquiryCreate,
    db: AsyncSession = Depends(get_db),
):
    """Submit a contact or demo inquiry (public, no auth required)."""
    # Validate inquiry_type
    try:
        inquiry_type = InquiryType(body.inquiry_type.upper())
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid inquiry_type: {body.inquiry_type}. "
            f"Must be one of: {', '.join(t.value for t in InquiryType)}",
        )

    inquiry = ContactInquiry(
        inquiry_type=inquiry_type,
        name=body.name,
        email=body.email,
        phone=body.phone,
        farm_size=body.farm_size,
        message=body.message,
    )
    db.add(inquiry)
    await db.commit()
    await db.refresh(inquiry)

    return inquiry


@router.get("/", response_model=list[InquiryResponse])
async def list_inquiries(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(
        require_roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
    ),
    db: AsyncSession = Depends(get_db),
):
    """List all contact inquiries (admin only), newest first."""
    result = await db.execute(
        select(ContactInquiry)
        .order_by(ContactInquiry.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return result.scalars().all()
