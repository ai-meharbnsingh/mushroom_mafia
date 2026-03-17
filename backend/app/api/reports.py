import os

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.report import Report
from app.models.plant import Plant
from app.models.user import User
from app.models.enums import UserRole
from app.schemas.report import ReportGenerateRequest, ReportResponse
from app.api.deps import get_current_user, require_roles
from app.services.report_generator import generate_report

router = APIRouter()


@router.get("/", response_model=list[ReportResponse])
async def list_reports(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List reports filtered by owner."""
    conditions = [Plant.owner_id == current_user.owner_id]
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.ADMIN]:
        if not current_user.assigned_plants:
            return []
        assigned_ids = [int(pid) for pid in current_user.assigned_plants]
        conditions.append(Plant.plant_id.in_(assigned_ids))

    result = await db.execute(
        select(Report)
        .join(Plant, Report.plant_id == Plant.plant_id)
        .where(*conditions)
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
    conditions = [
        Report.report_id == report_id,
        Plant.owner_id == current_user.owner_id,
    ]
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.ADMIN]:
        if not current_user.assigned_plants:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Report not found"
            )
        assigned_ids = [int(pid) for pid in current_user.assigned_plants]
        conditions.append(Plant.plant_id.in_(assigned_ids))

    result = await db.execute(
        select(Report).join(Plant, Report.plant_id == Plant.plant_id).where(*conditions)
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
async def generate_report_endpoint(
    report_in: ReportGenerateRequest,
    current_user: User = Depends(
        require_roles(UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
    ),
    db: AsyncSession = Depends(get_db),
):
    """Generate a report. MANAGER+ only.

    Creates a CSV file and stores the DB record with file_path and file_size.
    """
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

    # Generate the actual CSV file
    file_path, file_size = await generate_report(
        db=db,
        report_type=report_in.report_type,
        plant_id=report_in.plant_id,
        date_from=report_in.date_from,
        date_to=report_in.date_to,
    )

    report_data = report_in.model_dump()
    report_data["generated_by"] = current_user.user_id
    report_data["file_path"] = file_path
    report_data["file_size"] = file_size
    # Force format to CSV since we generate CSV files
    report_data["format"] = "CSV"

    report = Report(**report_data)
    db.add(report)
    await db.commit()
    await db.refresh(report)
    return report


@router.get("/{report_id}/download")
async def download_report(
    report_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Download a generated report file by report ID."""
    conditions = [
        Report.report_id == report_id,
        Plant.owner_id == current_user.owner_id,
    ]
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.ADMIN]:
        if not current_user.assigned_plants:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Report not found"
            )
        assigned_ids = [int(pid) for pid in current_user.assigned_plants]
        conditions.append(Plant.plant_id.in_(assigned_ids))

    result = await db.execute(
        select(Report).join(Plant, Report.plant_id == Plant.plant_id).where(*conditions)
    )
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Report not found"
        )

    if not report.file_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report file has not been generated",
        )

    if not os.path.isfile(report.file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report file not found on disk",
        )

    filename = os.path.basename(report.file_path)
    return FileResponse(
        path=report.file_path,
        media_type="text/csv",
        filename=filename,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.delete("/{report_id}", status_code=status.HTTP_200_OK)
async def delete_report(
    report_id: int,
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    """Delete a report. ADMIN+ only. Also removes the file from disk."""
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

    # Remove the file from disk if it exists
    if report.file_path and os.path.isfile(report.file_path):
        os.remove(report.file_path)

    await db.delete(report)
    await db.commit()
    return {"detail": "Report deleted"}
