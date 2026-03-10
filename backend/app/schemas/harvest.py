from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict


# ─── Harvest Schemas ─────────────────────────────────────────────────────────


class HarvestCreate(BaseModel):
    room_id: int
    harvested_at: Optional[datetime] = None  # defaults to now on server
    weight_kg: Decimal
    grade: str  # A, B, C
    notes: Optional[str] = None


class HarvestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    harvest_id: int
    room_id: int
    harvested_at: datetime
    weight_kg: Decimal
    grade: str
    notes: Optional[str] = None
    recorded_by: int
    created_at: datetime


class HarvestSummary(BaseModel):
    total_weight_kg: Decimal
    total_harvests: int
    grade_breakdown: dict[str, int]
    period: str


# ─── Growth Cycle Schemas ────────────────────────────────────────────────────


class GrowthCycleCreate(BaseModel):
    room_id: int
    started_at: Optional[datetime] = None  # defaults to now on server
    current_stage: str = "INOCULATION"
    expected_harvest_date: Optional[datetime] = None
    target_yield_kg: Optional[Decimal] = None
    notes: Optional[str] = None
    auto_adjust_thresholds: Optional[bool] = True


class GrowthCycleUpdate(BaseModel):
    current_stage: Optional[str] = None
    expected_harvest_date: Optional[datetime] = None
    target_yield_kg: Optional[Decimal] = None
    notes: Optional[str] = None
    auto_adjust_thresholds: Optional[bool] = None


class GrowthCycleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    cycle_id: int
    room_id: int
    started_at: datetime
    current_stage: str
    stage_changed_at: Optional[datetime] = None
    expected_harvest_date: Optional[datetime] = None
    target_yield_kg: Optional[Decimal] = None
    notes: Optional[str] = None
    auto_adjust_thresholds: bool = True
    created_by: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
