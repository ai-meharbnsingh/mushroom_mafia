"""Tests for app.services.report_generator — generate_report and helpers."""
import csv
import io
import os
from datetime import date, datetime, timezone

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import RoomReading, Room
from app.services.report_generator import generate_report, _empty_csv


# ---------------------------------------------------------------------------
# _empty_csv helper
# ---------------------------------------------------------------------------


def test_empty_csv_returns_header_only():
    """_empty_csv() returns a CSV string with only headers and no data rows."""
    headers = ["col_a", "col_b", "col_c"]
    result = _empty_csv(headers)

    reader = csv.reader(io.StringIO(result))
    rows = list(reader)
    assert len(rows) == 1  # Only header row
    assert rows[0] == headers


def test_empty_csv_with_single_header():
    """_empty_csv() works correctly with a single-column header."""
    result = _empty_csv(["only_col"])
    reader = csv.reader(io.StringIO(result))
    rows = list(reader)
    assert len(rows) == 1
    assert rows[0] == ["only_col"]


# ---------------------------------------------------------------------------
# generate_report — daily_summary with empty data
# ---------------------------------------------------------------------------


async def test_generate_report_daily_summary_empty_data(
    db_session: AsyncSession,
    seed_owner_plant_room_device,
):
    """generate_report() with type 'daily_summary' and no readings returns header-only CSV."""
    plant = seed_owner_plant_room_device["plant"]

    # Use a date range in the far future where there are no readings
    file_path, file_size = await generate_report(
        db_session,
        "daily_summary",
        plant.plant_id,
        date(2099, 1, 1),
        date(2099, 1, 31),
    )

    assert os.path.exists(file_path)
    assert file_size > 0

    with open(file_path, "r") as f:
        reader = csv.reader(f)
        rows = list(reader)

    # Should have at least the header row
    assert len(rows) >= 1
    header = rows[0]
    assert "date" in header
    assert "room_id" in header
    assert "avg_co2" in header
    assert "reading_count" in header
    # No data rows expected
    assert len(rows) == 1

    # Cleanup
    os.unlink(file_path)


# ---------------------------------------------------------------------------
# generate_report — daily_summary with data
# ---------------------------------------------------------------------------


@pytest.mark.skip(reason="SQLite CAST(datetime AS DATE) does not behave like PostgreSQL; daily_summary grouping requires PostgreSQL")
async def test_generate_report_daily_summary_with_readings(
    db_session: AsyncSession,
    seed_owner_plant_room_device,
):
    """generate_report() with type 'daily_summary' with actual data rows — requires PostgreSQL."""
    pass


async def test_generate_report_daily_summary_has_correct_headers(
    db_session: AsyncSession,
    seed_owner_plant_room_device,
):
    """generate_report() with type 'daily_summary' returns CSV with correct column headers."""
    plant = seed_owner_plant_room_device["plant"]

    file_path, file_size = await generate_report(
        db_session,
        "daily_summary",
        plant.plant_id,
        date(2025, 1, 1),
        date(2025, 12, 31),
    )

    assert os.path.exists(file_path)
    assert file_size > 0

    with open(file_path, "r") as f:
        reader = csv.reader(f)
        rows = list(reader)

    header = rows[0]
    expected = [
        "date", "room_id", "room_name",
        "avg_co2", "min_co2", "max_co2",
        "avg_temp", "min_temp", "max_temp",
        "avg_humidity", "min_humidity", "max_humidity",
        "reading_count",
    ]
    assert header == expected

    # Cleanup
    os.unlink(file_path)


# ---------------------------------------------------------------------------
# generate_report — alert_report with empty data
# ---------------------------------------------------------------------------


async def test_generate_report_alert_report_empty(
    db_session: AsyncSession,
    seed_owner_plant_room_device,
):
    """generate_report() with type 'alert_report' and no alerts returns header-only CSV."""
    plant = seed_owner_plant_room_device["plant"]

    file_path, file_size = await generate_report(
        db_session,
        "alert_report",
        plant.plant_id,
        date(2099, 1, 1),
        date(2099, 1, 31),
    )

    assert os.path.exists(file_path)

    with open(file_path, "r") as f:
        reader = csv.reader(f)
        rows = list(reader)

    assert len(rows) >= 1
    header = rows[0]
    assert "alert_id" in header
    assert "severity" in header
    assert "is_resolved" in header
    # No data rows
    assert len(rows) == 1

    os.unlink(file_path)


# ---------------------------------------------------------------------------
# generate_report — harvest_report with empty data
# ---------------------------------------------------------------------------


async def test_generate_report_harvest_report_empty(
    db_session: AsyncSession,
    seed_owner_plant_room_device,
):
    """generate_report() with type 'harvest_report' and no harvests returns header-only CSV."""
    plant = seed_owner_plant_room_device["plant"]

    file_path, file_size = await generate_report(
        db_session,
        "harvest_report",
        plant.plant_id,
        date(2099, 1, 1),
        date(2099, 1, 31),
    )

    assert os.path.exists(file_path)

    with open(file_path, "r") as f:
        reader = csv.reader(f)
        rows = list(reader)

    assert len(rows) >= 1
    header = rows[0]
    assert "harvest_id" in header
    assert "weight_kg" in header
    assert "grade" in header
    assert len(rows) == 1

    os.unlink(file_path)


# ---------------------------------------------------------------------------
# generate_report — weekly_summary (uses func.extract — PostgreSQL-specific)
# ---------------------------------------------------------------------------


@pytest.mark.skip(reason="weekly_summary uses func.extract('isoyear'/​'week') which requires PostgreSQL")
async def test_generate_report_weekly_summary():
    """generate_report() with type 'weekly_summary' — skipped because it uses PostgreSQL-specific extract."""
    pass


# ---------------------------------------------------------------------------
# generate_report — nonexistent plant (no rooms) returns empty CSV
# ---------------------------------------------------------------------------


async def test_generate_report_no_rooms_returns_empty_csv(
    db_session: AsyncSession,
):
    """generate_report() for a plant_id with no rooms returns header-only CSV."""
    # plant_id=99999 does not exist — will produce empty room_ids
    file_path, file_size = await generate_report(
        db_session,
        "daily_summary",
        99999,
        date(2025, 1, 1),
        date(2025, 12, 31),
    )

    assert os.path.exists(file_path)

    with open(file_path, "r") as f:
        reader = csv.reader(f)
        rows = list(reader)

    # Only the header row (empty CSV path)
    assert len(rows) == 1
    assert "date" in rows[0]

    os.unlink(file_path)
