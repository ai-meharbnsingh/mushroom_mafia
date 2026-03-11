"""
Pure logic tests for climate advisory functions.

No database, no Redis, no async -- tests exercise synchronous helper functions directly.
"""

from decimal import Decimal

import pytest

from app.models.enums import GrowthStage
from app.services.climate_advisory import (
    _compute_deviation,
    _get_next_stage,
    STAGE_ORDER,
)


# ============================================================================
# STAGE_ORDER
# ============================================================================

class TestStageOrder:
    """Tests for climate_advisory.STAGE_ORDER."""

    def test_contains_all_expected_stages(self):
        expected = [
            GrowthStage.INOCULATION,
            GrowthStage.SPAWN_RUN,
            GrowthStage.INCUBATION,
            GrowthStage.FRUITING,
            GrowthStage.HARVEST,
            GrowthStage.IDLE,
        ]
        assert STAGE_ORDER == expected

    def test_stage_count(self):
        assert len(STAGE_ORDER) == 6

    def test_first_stage_is_inoculation(self):
        assert STAGE_ORDER[0] == GrowthStage.INOCULATION

    def test_last_stage_is_idle(self):
        assert STAGE_ORDER[-1] == GrowthStage.IDLE


# ============================================================================
# _get_next_stage
# ============================================================================

class TestGetNextStage:
    """Tests for climate_advisory._get_next_stage."""

    def test_inoculation_to_spawn_run(self):
        assert _get_next_stage(GrowthStage.INOCULATION) == GrowthStage.SPAWN_RUN

    def test_spawn_run_to_incubation(self):
        assert _get_next_stage(GrowthStage.SPAWN_RUN) == GrowthStage.INCUBATION

    def test_incubation_to_fruiting(self):
        assert _get_next_stage(GrowthStage.INCUBATION) == GrowthStage.FRUITING

    def test_fruiting_to_harvest(self):
        assert _get_next_stage(GrowthStage.FRUITING) == GrowthStage.HARVEST

    def test_harvest_to_idle(self):
        assert _get_next_stage(GrowthStage.HARVEST) == GrowthStage.IDLE

    def test_idle_returns_none(self):
        """IDLE is the final stage, so next stage is None."""
        assert _get_next_stage(GrowthStage.IDLE) is None

    def test_full_progression_chain(self):
        """Walk the full chain from INOCULATION to None."""
        stage = GrowthStage.INOCULATION
        visited = [stage]
        while True:
            nxt = _get_next_stage(stage)
            if nxt is None:
                break
            visited.append(nxt)
            stage = nxt
        assert visited == STAGE_ORDER


# ============================================================================
# _compute_deviation
# ============================================================================

class TestComputeDeviation:
    """Tests for climate_advisory._compute_deviation."""

    # --- Value too high ---

    def test_too_high_warning(self):
        """Current max above guideline max by a small amount => too_high + warning."""
        result = _compute_deviation(
            parameter="CO2",
            current_min=Decimal("400"),
            current_max=Decimal("1100"),
            guideline_min=Decimal("400"),
            guideline_max=Decimal("1000"),
        )
        assert result.direction == "too_high"
        assert result.severity == "warning"
        assert result.parameter == "CO2"
        assert result.current_value == Decimal("1100")
        assert result.recommended_value == Decimal("1000")

    def test_too_high_critical(self):
        """Current max exceeds guideline max by more than 20% => critical."""
        # guideline_max=1000, 20% threshold = 200
        # diff = 1300 - 1000 = 300 > 200 => critical
        result = _compute_deviation(
            parameter="CO2",
            current_min=Decimal("400"),
            current_max=Decimal("1300"),
            guideline_min=Decimal("400"),
            guideline_max=Decimal("1000"),
        )
        assert result.direction == "too_high"
        assert result.severity == "critical"

    # --- Value too low ---

    def test_too_low_warning(self):
        """Current min below guideline min by a small amount => too_low + warning."""
        result = _compute_deviation(
            parameter="TEMPERATURE",
            current_min=Decimal("18"),
            current_max=Decimal("25"),
            guideline_min=Decimal("20"),
            guideline_max=Decimal("28"),
        )
        assert result.direction == "too_low"
        assert result.severity == "warning"
        assert result.current_value == Decimal("18")
        assert result.recommended_value == Decimal("20")

    def test_too_low_critical(self):
        """Current min below guideline min by more than 20% => critical."""
        # guideline_min=20, 20% threshold = 4
        # diff = 20 - 14 = 6 > 4 => critical
        result = _compute_deviation(
            parameter="TEMPERATURE",
            current_min=Decimal("14"),
            current_max=Decimal("25"),
            guideline_min=Decimal("20"),
            guideline_max=Decimal("28"),
        )
        assert result.direction == "too_low"
        assert result.severity == "critical"

    # --- Value in range (ok) ---

    def test_within_range_is_ok(self):
        result = _compute_deviation(
            parameter="HUMIDITY",
            current_min=Decimal("80"),
            current_max=Decimal("90"),
            guideline_min=Decimal("75"),
            guideline_max=Decimal("95"),
        )
        assert result.direction == "ok"
        assert result.severity == "ok"

    def test_exact_boundary_is_ok(self):
        """Values matching guideline boundaries exactly should be ok."""
        result = _compute_deviation(
            parameter="CO2",
            current_min=Decimal("400"),
            current_max=Decimal("1000"),
            guideline_min=Decimal("400"),
            guideline_max=Decimal("1000"),
        )
        assert result.direction == "ok"
        assert result.severity == "ok"

    # --- None guideline values ---

    def test_none_guideline_both_returns_ok(self):
        """When both guideline min and max are None, result is ok."""
        result = _compute_deviation(
            parameter="CO2",
            current_min=Decimal("400"),
            current_max=Decimal("1500"),
            guideline_min=None,
            guideline_max=None,
        )
        assert result.direction == "ok"
        assert result.severity == "ok"
        assert result.current_value is None
        assert result.recommended_value is None

    def test_none_guideline_min_only_checks_max(self):
        """When guideline_min is None, only guideline_max is checked."""
        result = _compute_deviation(
            parameter="CO2",
            current_min=Decimal("100"),
            current_max=Decimal("1200"),
            guideline_min=None,
            guideline_max=Decimal("1000"),
        )
        # current_max (1200) > guideline_max (1000) => too_high
        assert result.direction == "too_high"

    def test_none_guideline_max_only_checks_min(self):
        """When guideline_max is None, only guideline_min is checked."""
        result = _compute_deviation(
            parameter="TEMPERATURE",
            current_min=Decimal("10"),
            current_max=Decimal("25"),
            guideline_min=Decimal("15"),
            guideline_max=None,
        )
        # current_min (10) < guideline_min (15) => too_low
        assert result.direction == "too_low"

    # --- None current values ---

    def test_none_current_min_skips_low_check(self):
        """If current_min is None, the too_low check is skipped."""
        result = _compute_deviation(
            parameter="CO2",
            current_min=None,
            current_max=Decimal("900"),
            guideline_min=Decimal("400"),
            guideline_max=Decimal("1000"),
        )
        # current_min is None, so too_low check is skipped
        # current_max (900) <= guideline_max (1000), so not too_high
        assert result.direction == "ok"

    def test_none_current_max_skips_high_check(self):
        """If current_max is None, the too_high check is skipped."""
        result = _compute_deviation(
            parameter="CO2",
            current_min=Decimal("500"),
            current_max=None,
            guideline_min=Decimal("400"),
            guideline_max=Decimal("1000"),
        )
        # current_max is None, so too_high check is skipped
        # current_min (500) >= guideline_min (400), so not too_low
        assert result.direction == "ok"

    # --- Severity thresholds ---

    def test_too_high_exactly_at_20pct_boundary(self):
        """Diff equals exactly 20% of guideline_max => NOT critical (not strictly >)."""
        # guideline_max=1000, 20% = 200, diff = 200 => NOT > 200
        result = _compute_deviation(
            parameter="CO2",
            current_min=Decimal("400"),
            current_max=Decimal("1200"),
            guideline_min=Decimal("400"),
            guideline_max=Decimal("1000"),
        )
        assert result.direction == "too_high"
        assert result.severity == "warning"

    def test_too_high_just_over_20pct_boundary(self):
        """Diff exceeds 20% of guideline_max by 1 => critical."""
        # guideline_max=1000, 20% = 200, diff = 201 > 200 => critical
        result = _compute_deviation(
            parameter="CO2",
            current_min=Decimal("400"),
            current_max=Decimal("1201"),
            guideline_min=Decimal("400"),
            guideline_max=Decimal("1000"),
        )
        assert result.direction == "too_high"
        assert result.severity == "critical"

    def test_zero_guideline_max_uses_fallback_threshold(self):
        """When guideline_max is 0, fallback threshold of 5.0 is used."""
        result = _compute_deviation(
            parameter="TEMPERATURE",
            current_min=Decimal("-5"),
            current_max=Decimal("10"),
            guideline_min=Decimal("-5"),
            guideline_max=Decimal("0"),
        )
        # diff = 10 - 0 = 10 > 5.0 fallback => critical
        assert result.direction == "too_high"
        assert result.severity == "critical"

    def test_zero_guideline_min_uses_fallback_threshold(self):
        """When guideline_min is 0, fallback threshold of 5.0 is used."""
        result = _compute_deviation(
            parameter="TEMPERATURE",
            current_min=Decimal("-3"),
            current_max=Decimal("10"),
            guideline_min=Decimal("0"),
            guideline_max=Decimal("10"),
        )
        # diff = |0 - (-3)| = 3 < 5.0 fallback => warning
        assert result.direction == "too_low"
        assert result.severity == "warning"
