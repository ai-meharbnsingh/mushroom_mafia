from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.report import Report
from app.models.plant import Plant
from app.models.user import User
from app.models.enums import UserRole
from app.schemas.report import ReportGenerateRequest, ReportResponse
from app.api.deps import get_current_user, require_roles

router = APIRouter()


@router.get("/", response_model=list[ReportResponse])
async def list_reports(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List reports filtered by owner."""
    result = await db.execute(
        select(Report)
        .join(Plant, Report.plant_id == Plant.plant_id)
        .where(Plant.owner_id == current_user.owner_id)
        .order_by(Report.generated_at.desc())
    )
    return result.scalars().all()


@router.get("/{report_id}", response_model=ReportResponse)
async def get_report(
    report_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get report by ID."""
    result = await db.execute(
        select(Report)
        .join(Plant, Report.plant_id == Plant.plant_id)
        .where(
            Report.report_id == report_id,
            Plant.owner_id == current_user.owner_id,
        )
    )
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Report not found"
        )
    return report


@router.post(
    "/generate", response_model=ReportResponse, status_code=status.HTTP_201_CREATED
)
async def generate_report(
    report_in: ReportGenerateRequest,
    current_user: User = Depends(
        require_roles(UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
    ),
    db: AsyncSession = Depends(get_db),
):
    """Generate a report. MANAGER+ only.
    Creates the DB record with metadata. Actual PDF generation is a stub."""
    # Verify plant belongs to the user's owner
    plant_result = await db.execute(
        select(Plant).where(
            Plant.plant_id == report_in.plant_id, Plant.is_active == True
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
    report_data = report_in.model_dump()
    report_data["generated_by"] = current_user.user_id
    # Stub: file_path and file_size will be populated by actual generation logic
    report_data["file_path"] = None
    report_data["file_size"] = None
    report = Report(**report_data)
    db.add(report)
    await db.commit()
    await db.refresh(report)
    return report


@router.delete("/{report_id}", status_code=status.HTTP_200_OK)
async def delete_report(
    report_id: int,
    current_user: User = Depends(
        require_roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    ),
    db: AsyncSession = Depends(get_db),
):
    """Delete a report. ADMIN+ only."""
    result = await db.execute(
        select(Report)
        .join(Plant, Report.plant_id == Plant.plant_id)
        .where(
            Report.report_id == report_id,
            Plant.owner_id == current_user.owner_id,
        )
    )
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Report not found"
        )
    await db.delete(report)
    await db.commit()
    return {"detail": "Report deleted"}
