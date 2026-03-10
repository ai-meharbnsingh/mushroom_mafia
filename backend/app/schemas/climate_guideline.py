from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict


# ─── Climate Guideline Schemas ──────────────────────────────────────────────


class ClimateGuidelineResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    guideline_id: int
    plant_type: str
    growth_stage: str
    temp_min: Optional[Decimal] = None
    temp_max: Optional[Decimal] = None
    humidity_min: Optional[Decimal] = None
    humidity_max: Optional[Decimal] = None
    co2_min: Optional[Decimal] = None
    co2_max: Optional[Decimal] = None
    temp_hysteresis: Optional[Decimal] = None
    humidity_hysteresis: Optional[Decimal] = None
    co2_hysteresis: Optional[Decimal] = None
    duration_days_min: Optional[int] = None
    duration_days_max: Optional[int] = None
    notes: Optional[str] = None
    is_default: bool
    created_at: datetime
    updated_at: datetime


class ClimateGuidelineUpdate(BaseModel):
    temp_min: Optional[Decimal] = None
    temp_max: Optional[Decimal] = None
    humidity_min: Optional[Decimal] = None
    humidity_max: Optional[Decimal] = None
    co2_min: Optional[Decimal] = None
    co2_max: Optional[Decimal] = None
    temp_hysteresis: Optional[Decimal] = None
    humidity_hysteresis: Optional[Decimal] = None
    co2_hysteresis: Optional[Decimal] = None
    duration_days_min: Optional[int] = None
    duration_days_max: Optional[int] = None
    notes: Optional[str] = None
    is_default: Optional[bool] = None


# ─── Climate Deviation Schemas ───────────────────────────────────────────────


class ClimateDeviationItem(BaseModel):
    parameter: str  # CO2, HUMIDITY, TEMPERATURE
    direction: str  # too_high, too_low, ok
    current_value: Optional[Decimal] = None
    recommended_value: Optional[Decimal] = None
    severity: str  # ok, warning, critical


# ─── Climate Advisory Response ───────────────────────────────────────────────


class ClimateAdvisoryResponse(BaseModel):
    room_id: int
    current_stage: Optional[str] = None
    plant_type: Optional[str] = None
    recommended: Optional[ClimateGuidelineResponse] = None
    current_thresholds: dict = {}
    deviations: list[ClimateDeviationItem] = []
    days_in_stage: Optional[int] = None
    stage_duration_min: Optional[int] = None
    stage_duration_max: Optional[int] = None
    transition_reminder: Optional[str] = None
    next_stage: Optional[str] = None
    next_stage_preview: Optional[ClimateGuidelineResponse] = None
    auto_adjust_enabled: bool = False
    suggestions: list[str] = []
