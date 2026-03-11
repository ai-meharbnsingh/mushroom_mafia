"""
Pure logic tests for relay automation and relay scheduler functions.

No database, no Redis, no async -- tests exercise synchronous helper functions directly.
"""

from datetime import datetime
from types import SimpleNamespace

import pytest

from app.models.enums import ThresholdParameter
from app.services.relay_automation import (
    _should_change_relay,
    _get_sensor_value,
    DEFAULT_PARAM_MAPPING,
)
from app.services.relay_scheduler import (
    _is_day_active,
    _time_str_to_minutes,
    _should_be_on,
    WEEKDAY_BITS,
)


# ============================================================================
# _should_change_relay
# ============================================================================

class TestShouldChangeRelay:
    """Tests for relay_automation._should_change_relay."""

    # --- Basic threshold triggers ---

    def test_above_max_triggers_on_when_action_on_high_is_on(self):
        result = _should_change_relay(
            current_value=1200.0,
            min_val=400.0,
            max_val=1000.0,
            hysteresis=50.0,
            action_on_high="ON",
            action_on_low="OFF",
            current_state=None,
        )
        assert result is True

    def test_above_max_triggers_off_when_action_on_high_is_off(self):
        result = _should_change_relay(
            current_value=1200.0,
            min_val=400.0,
            max_val=1000.0,
            hysteresis=50.0,
            action_on_high="OFF",
            action_on_low="ON",
            current_state=None,
        )
        assert result is False

    def test_below_min_triggers_on_when_action_on_low_is_on(self):
        result = _should_change_relay(
            current_value=300.0,
            min_val=400.0,
            max_val=1000.0,
            hysteresis=50.0,
            action_on_high="ON",
            action_on_low="ON",
            current_state=None,
        )
        assert result is True

    def test_below_min_triggers_off_when_action_on_low_is_off(self):
        result = _should_change_relay(
            current_value=300.0,
            min_val=400.0,
            max_val=1000.0,
            hysteresis=50.0,
            action_on_high="ON",
            action_on_low="OFF",
            current_state=None,
        )
        assert result is False

    def test_within_range_no_change_with_none_current_state(self):
        result = _should_change_relay(
            current_value=700.0,
            min_val=400.0,
            max_val=1000.0,
            hysteresis=50.0,
            action_on_high="ON",
            action_on_low="OFF",
            current_state=None,
        )
        assert result is None

    # --- Already in correct state ---

    def test_above_max_already_on_returns_none(self):
        """When value is above max and relay is already in the desired state, no change."""
        result = _should_change_relay(
            current_value=1200.0,
            min_val=400.0,
            max_val=1000.0,
            hysteresis=50.0,
            action_on_high="ON",
            action_on_low="OFF",
            current_state=True,  # already ON
        )
        assert result is None

    def test_below_min_already_off_returns_none(self):
        result = _should_change_relay(
            current_value=300.0,
            min_val=400.0,
            max_val=1000.0,
            hysteresis=50.0,
            action_on_high="ON",
            action_on_low="OFF",
            current_state=False,  # already OFF (action_on_low=OFF)
        )
        assert result is None

    # --- None current_state (first reading, no state in Redis) ---

    def test_none_current_state_above_max(self):
        result = _should_change_relay(
            current_value=1100.0,
            min_val=400.0,
            max_val=1000.0,
            hysteresis=50.0,
            action_on_high="ON",
            action_on_low="OFF",
            current_state=None,
        )
        assert result is True

    def test_none_current_state_in_range_returns_none(self):
        """With no current_state and value in range, no change should be emitted."""
        result = _should_change_relay(
            current_value=700.0,
            min_val=400.0,
            max_val=1000.0,
            hysteresis=50.0,
            action_on_high="ON",
            action_on_low="OFF",
            current_state=None,
        )
        assert result is None

    # --- Hysteresis edge cases ---

    def test_hysteresis_prevents_flapping_within_zone(self):
        """Value is within range but NOT past hysteresis band -- no change."""
        # max=1000, hysteresis=50: relay should stay ON until value <= 950
        # value=960 is within (max - hysteresis) to max, i.e. in hysteresis zone
        result = _should_change_relay(
            current_value=960.0,
            min_val=400.0,
            max_val=1000.0,
            hysteresis=50.0,
            action_on_high="ON",
            action_on_low="OFF",
            current_state=True,  # relay is ON due to previous high
        )
        # 960 is in range AND 960 > (1000 - 50=950), so the hysteresis branch
        # does NOT trigger the opposite. No change needed.
        assert result is None

    def test_hysteresis_allows_return_past_band(self):
        """Value dropped well below (max - hysteresis), relay should turn off."""
        # max=1000, hysteresis=50, so when value <= 950 the relay can return to opposite
        result = _should_change_relay(
            current_value=940.0,
            min_val=400.0,
            max_val=1000.0,
            hysteresis=50.0,
            action_on_high="ON",
            action_on_low="OFF",
            current_state=True,  # relay is ON
        )
        # 940 <= (1000 - 50=950), opposite of desired_on_high (True) is False
        # current_state (True) != opposite (False) => return False
        assert result is False

    def test_hysteresis_low_side_prevents_flapping(self):
        """Value is above min but not past (min + hysteresis) -- no change.
        Use max_val=None to isolate the min-side hysteresis logic, since
        the code checks max hysteresis first when both are present."""
        # min=400, hysteresis=50: relay should stay until value >= 450
        result = _should_change_relay(
            current_value=420.0,
            min_val=400.0,
            max_val=None,  # None so max hysteresis check is skipped
            hysteresis=50.0,
            action_on_high="ON",
            action_on_low="ON",
            current_state=True,  # relay ON due to previous low
        )
        # 420 is in range, but 420 < (400 + 50=450), so hysteresis zone
        # max_val is None so the max hysteresis check doesn't fire
        assert result is None

    def test_hysteresis_low_side_allows_return(self):
        """Value rose above (min + hysteresis), relay can return to opposite."""
        result = _should_change_relay(
            current_value=460.0,
            min_val=400.0,
            max_val=1000.0,
            hysteresis=50.0,
            action_on_high="ON",
            action_on_low="ON",
            current_state=True,  # relay is ON
        )
        # 460 >= (400 + 50=450), opposite of desired_on_low (ON=True) is False
        # current_state (True) != False => return False
        assert result is False

    def test_zero_hysteresis(self):
        """With hysteresis=0, value at exact boundary of (max - 0) triggers return."""
        result = _should_change_relay(
            current_value=999.0,
            min_val=400.0,
            max_val=1000.0,
            hysteresis=0.0,
            action_on_high="ON",
            action_on_low="OFF",
            current_state=True,
        )
        # 999 <= (1000 - 0=1000) => True, opposite is False, current_state True != False
        assert result is False

    # --- None min/max ---

    def test_none_max_val_only_checks_min(self):
        result = _should_change_relay(
            current_value=300.0,
            min_val=400.0,
            max_val=None,
            hysteresis=50.0,
            action_on_high="ON",
            action_on_low="ON",
            current_state=None,
        )
        assert result is True  # below min triggers action_on_low

    def test_none_min_val_only_checks_max(self):
        result = _should_change_relay(
            current_value=1200.0,
            min_val=None,
            max_val=1000.0,
            hysteresis=50.0,
            action_on_high="ON",
            action_on_low="OFF",
            current_state=None,
        )
        assert result is True  # above max triggers action_on_high


# ============================================================================
# _get_sensor_value
# ============================================================================

class TestGetSensorValue:
    """Tests for relay_automation._get_sensor_value."""

    def test_extract_co2(self):
        data = {"co2_ppm": 850, "room_temp": 22.5, "room_humidity": 88}
        assert _get_sensor_value(data, ThresholdParameter.CO2) == 850.0

    def test_extract_temperature(self):
        data = {"co2_ppm": 850, "room_temp": 22.5, "room_humidity": 88}
        assert _get_sensor_value(data, ThresholdParameter.TEMPERATURE) == 22.5

    def test_extract_humidity(self):
        data = {"co2_ppm": 850, "room_temp": 22.5, "room_humidity": 88}
        assert _get_sensor_value(data, ThresholdParameter.HUMIDITY) == 88.0

    def test_missing_key_returns_none(self):
        data = {"room_temp": 22.5}  # no co2_ppm
        assert _get_sensor_value(data, ThresholdParameter.CO2) is None

    def test_empty_dict_returns_none(self):
        assert _get_sensor_value({}, ThresholdParameter.CO2) is None

    def test_none_value_returns_none(self):
        data = {"co2_ppm": None}
        assert _get_sensor_value(data, ThresholdParameter.CO2) is None

    def test_string_numeric_value_converted(self):
        data = {"co2_ppm": "900"}
        assert _get_sensor_value(data, ThresholdParameter.CO2) == 900.0

    def test_invalid_string_returns_none(self):
        data = {"co2_ppm": "not-a-number"}
        assert _get_sensor_value(data, ThresholdParameter.CO2) is None

    def test_float_values(self):
        data = {"room_temp": 22.75}
        assert _get_sensor_value(data, ThresholdParameter.TEMPERATURE) == 22.75


# ============================================================================
# DEFAULT_PARAM_MAPPING
# ============================================================================

class TestDefaultParamMapping:
    """Tests for relay_automation.DEFAULT_PARAM_MAPPING."""

    def test_co2_maps_to_co2(self):
        assert DEFAULT_PARAM_MAPPING["CO2"] == ThresholdParameter.CO2

    def test_humidity_maps_to_humidity(self):
        assert DEFAULT_PARAM_MAPPING["HUMIDITY"] == ThresholdParameter.HUMIDITY

    def test_temperature_maps_to_temperature(self):
        assert DEFAULT_PARAM_MAPPING["TEMPERATURE"] == ThresholdParameter.TEMPERATURE

    def test_ahu_maps_to_temperature(self):
        assert DEFAULT_PARAM_MAPPING["AHU"] == ThresholdParameter.TEMPERATURE

    def test_humidifier_maps_to_humidity(self):
        assert DEFAULT_PARAM_MAPPING["HUMIDIFIER"] == ThresholdParameter.HUMIDITY

    def test_duct_fan_maps_to_co2(self):
        assert DEFAULT_PARAM_MAPPING["DUCT_FAN"] == ThresholdParameter.CO2

    def test_extra_has_no_param(self):
        assert DEFAULT_PARAM_MAPPING["EXTRA"] is None


# ============================================================================
# _is_day_active
# ============================================================================

class TestIsDayActive:
    """Tests for relay_scheduler._is_day_active."""

    def test_monday_active(self):
        # Monday = weekday 0, bitmask bit 0 = value 1
        assert _is_day_active(1, 0) is True

    def test_monday_inactive(self):
        # bitmask 0 means no days active
        assert _is_day_active(0, 0) is False

    def test_sunday_active(self):
        # Sunday = weekday 6, bitmask bit 6 = value 64
        assert _is_day_active(64, 6) is True

    def test_sunday_inactive_when_only_monday(self):
        assert _is_day_active(1, 6) is False

    def test_all_days_active(self):
        # 127 = 1+2+4+8+16+32+64 = all days
        for weekday in range(7):
            assert _is_day_active(127, weekday) is True

    def test_no_days_active(self):
        for weekday in range(7):
            assert _is_day_active(0, weekday) is False

    def test_weekdays_only(self):
        # Mon-Fri = 1+2+4+8+16 = 31
        for weekday in range(5):
            assert _is_day_active(31, weekday) is True
        # Saturday (5) and Sunday (6)
        assert _is_day_active(31, 5) is False
        assert _is_day_active(31, 6) is False

    def test_weekend_only(self):
        # Sat+Sun = 32+64 = 96
        assert _is_day_active(96, 5) is True
        assert _is_day_active(96, 6) is True
        assert _is_day_active(96, 0) is False

    def test_tuesday_and_thursday(self):
        # Tue=2, Thu=8 => 10
        assert _is_day_active(10, 1) is True   # Tuesday
        assert _is_day_active(10, 3) is True   # Thursday
        assert _is_day_active(10, 0) is False  # Monday
        assert _is_day_active(10, 2) is False  # Wednesday


# ============================================================================
# _time_str_to_minutes
# ============================================================================

class TestTimeStrToMinutes:
    """Tests for relay_scheduler._time_str_to_minutes."""

    def test_midnight(self):
        assert _time_str_to_minutes("00:00") == 0

    def test_eight_am(self):
        assert _time_str_to_minutes("08:00") == 480

    def test_noon(self):
        assert _time_str_to_minutes("12:00") == 720

    def test_end_of_day(self):
        assert _time_str_to_minutes("23:59") == 1439

    def test_one_thirty_pm(self):
        assert _time_str_to_minutes("13:30") == 810

    def test_six_am(self):
        assert _time_str_to_minutes("06:00") == 360


# ============================================================================
# _should_be_on
# ============================================================================

class TestShouldBeOn:
    """Tests for relay_scheduler._should_be_on."""

    def _make_schedule(self, days_of_week, time_on, time_off):
        """Create a minimal schedule-like object with the required attributes."""
        return SimpleNamespace(
            days_of_week=days_of_week,
            time_on=time_on,
            time_off=time_off,
        )

    # --- Normal schedule (on < off, same day) ---

    def test_normal_schedule_within_range(self):
        # 08:00-20:00 on all days, current time = Monday 10:00
        schedule = self._make_schedule(127, "08:00", "20:00")
        now = datetime(2026, 3, 9, 10, 0)  # Monday
        assert _should_be_on(schedule, now) is True

    def test_normal_schedule_before_start(self):
        schedule = self._make_schedule(127, "08:00", "20:00")
        now = datetime(2026, 3, 9, 7, 0)  # Monday 07:00
        assert _should_be_on(schedule, now) is False

    def test_normal_schedule_after_end(self):
        schedule = self._make_schedule(127, "08:00", "20:00")
        now = datetime(2026, 3, 9, 22, 0)  # Monday 22:00
        assert _should_be_on(schedule, now) is False

    def test_normal_schedule_at_exact_start(self):
        schedule = self._make_schedule(127, "08:00", "20:00")
        now = datetime(2026, 3, 9, 8, 0)  # Monday 08:00 exactly
        assert _should_be_on(schedule, now) is True

    def test_normal_schedule_at_exact_end(self):
        """At exactly off time, schedule should be OFF (< off_minutes)."""
        schedule = self._make_schedule(127, "08:00", "20:00")
        now = datetime(2026, 3, 9, 20, 0)  # Monday 20:00 exactly
        assert _should_be_on(schedule, now) is False

    # --- Overnight schedule (on > off, crosses midnight) ---

    def test_overnight_schedule_after_start(self):
        # 22:00-06:00 on all days
        schedule = self._make_schedule(127, "22:00", "06:00")
        now = datetime(2026, 3, 9, 23, 0)  # Monday 23:00
        assert _should_be_on(schedule, now) is True

    def test_overnight_schedule_before_end_next_day(self):
        schedule = self._make_schedule(127, "22:00", "06:00")
        now = datetime(2026, 3, 10, 3, 0)  # Tuesday 03:00
        assert _should_be_on(schedule, now) is True

    def test_overnight_schedule_during_day(self):
        schedule = self._make_schedule(127, "22:00", "06:00")
        now = datetime(2026, 3, 9, 12, 0)  # Monday 12:00
        assert _should_be_on(schedule, now) is False

    def test_overnight_at_exact_start(self):
        schedule = self._make_schedule(127, "22:00", "06:00")
        now = datetime(2026, 3, 9, 22, 0)  # Monday 22:00 exactly
        assert _should_be_on(schedule, now) is True

    def test_overnight_at_exact_end(self):
        """At exactly off time, schedule should be OFF."""
        schedule = self._make_schedule(127, "22:00", "06:00")
        now = datetime(2026, 3, 10, 6, 0)  # Tuesday 06:00 exactly
        assert _should_be_on(schedule, now) is False

    # --- Inactive day ---

    def test_inactive_day_returns_false(self):
        # Monday only (bitmask=1), but current day is Tuesday
        schedule = self._make_schedule(1, "08:00", "20:00")
        now = datetime(2026, 3, 10, 10, 0)  # Tuesday
        assert _should_be_on(schedule, now) is False

    def test_active_day_returns_true(self):
        # Monday only (bitmask=1)
        schedule = self._make_schedule(1, "08:00", "20:00")
        now = datetime(2026, 3, 9, 10, 0)  # Monday
        assert _should_be_on(schedule, now) is True

    def test_no_days_active_always_false(self):
        schedule = self._make_schedule(0, "00:00", "23:59")
        now = datetime(2026, 3, 9, 12, 0)  # Monday
        assert _should_be_on(schedule, now) is False

    # --- Boundary: full day schedule ---

    def test_full_day_schedule_midnight_to_midnight(self):
        """00:00 to 00:00 means on_minutes == off_minutes == 0.
        Since on_minutes <= off_minutes (0 <= 0), the normal branch is used:
        on_minutes <= current_minutes < off_minutes => 0 <= X < 0 => always False."""
        schedule = self._make_schedule(127, "00:00", "00:00")
        now = datetime(2026, 3, 9, 12, 0)
        assert _should_be_on(schedule, now) is False
