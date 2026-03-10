"""Report generator service — creates CSV files for various report types."""

import csv
import io
from datetime import datetime, date
from pathlib import Path

from sqlalchemy import select, func, cast, Date
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.room_reading import RoomReading
from app.models.room import Room
from app.models.alert import Alert
from app.models.harvest import Harvest

# Reports are written to backend/reports/
REPORTS_DIR = Path(__file__).resolve().parent.parent.parent / "reports"


async def generate_report(
    db: AsyncSession,
    report_type: str,
    plant_id: int,
    date_from: date,
    date_to: date,
) -> tuple[str, int]:
    """Generate a CSV report and return (file_path, file_size).

    Supported report_types:
        - daily_summary
        - weekly_summary
        - alert_report
        - harvest_report
    """
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    filename = f"{report_type}_{timestamp}.csv"
    file_path = REPORTS_DIR / filename

    # Fetch the room IDs belonging to this plant so all queries are plant-scoped
    room_result = await db.execute(
        select(Room.room_id, Room.room_name).where(Room.plant_id == plant_id)
    )
    rooms = room_result.all()
    room_ids = [r.room_id for r in rooms]
    room_name_map = {r.room_id: r.room_name for r in rooms}

    if report_type == "daily_summary":
        content = await _daily_summary(db, room_ids, room_name_map, date_from, date_to)
    elif report_type == "weekly_summary":
        content = await _weekly_summary(db, room_ids, room_name_map, date_from, date_to)
    elif report_type == "alert_report":
        content = await _alert_report(db, room_ids, room_name_map, date_from, date_to)
    elif report_type == "harvest_report":
        content = await _harvest_report(db, room_ids, room_name_map, date_from, date_to)
    else:
        # Fallback: generate a daily summary for unknown types
        content = await _daily_summary(db, room_ids, room_name_map, date_from, date_to)

    file_path.write_text(content, encoding="utf-8")
    file_size = file_path.stat().st_size

    return str(file_path), file_size


# ---------------------------------------------------------------------------
# Daily Summary
# ---------------------------------------------------------------------------

async def _daily_summary(
    db: AsyncSession,
    room_ids: list[int],
    room_name_map: dict[int, str],
    date_from: date,
    date_to: date,
) -> str:
    """Sensor averages / min / max per room per day."""
    if not room_ids:
        return _empty_csv(
            ["date", "room_id", "room_name",
             "avg_co2", "min_co2", "max_co2",
             "avg_temp", "min_temp", "max_temp",
             "avg_humidity", "min_humidity", "max_humidity",
             "reading_count"]
        )

    day_col = cast(RoomReading.recorded_at, Date).label("day")

    result = await db.execute(
        select(
            day_col,
            RoomReading.room_id,
            func.round(func.avg(RoomReading.co2_ppm), 1).label("avg_co2"),
            func.min(RoomReading.co2_ppm).label("min_co2"),
            func.max(RoomReading.co2_ppm).label("max_co2"),
            func.round(func.avg(RoomReading.room_temp), 2).label("avg_temp"),
            func.min(RoomReading.room_temp).label("min_temp"),
            func.max(RoomReading.room_temp).label("max_temp"),
            func.round(func.avg(RoomReading.room_humidity), 2).label("avg_humidity"),
            func.min(RoomReading.room_humidity).label("min_humidity"),
            func.max(RoomReading.room_humidity).label("max_humidity"),
            func.count().label("reading_count"),
        )
        .where(
            RoomReading.room_id.in_(room_ids),
            cast(RoomReading.recorded_at, Date) >= date_from,
            cast(RoomReading.recorded_at, Date) <= date_to,
        )
        .group_by(day_col, RoomReading.room_id)
        .order_by(day_col, RoomReading.room_id)
    )
    rows = result.all()

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow([
        "date", "room_id", "room_name",
        "avg_co2", "min_co2", "max_co2",
        "avg_temp", "min_temp", "max_temp",
        "avg_humidity", "min_humidity", "max_humidity",
        "reading_count",
    ])
    for row in rows:
        writer.writerow([
            str(row.day),
            row.room_id,
            room_name_map.get(row.room_id, ""),
            row.avg_co2, row.min_co2, row.max_co2,
            row.avg_temp, row.min_temp, row.max_temp,
            row.avg_humidity, row.min_humidity, row.max_humidity,
            row.reading_count,
        ])
    return buf.getvalue()


# ---------------------------------------------------------------------------
# Weekly Summary
# ---------------------------------------------------------------------------

async def _weekly_summary(
    db: AsyncSession,
    room_ids: list[int],
    room_name_map: dict[int, str],
    date_from: date,
    date_to: date,
) -> str:
    """Sensor averages / min / max per room per ISO week."""
    if not room_ids:
        return _empty_csv(
            ["year", "week", "room_id", "room_name",
             "avg_co2", "min_co2", "max_co2",
             "avg_temp", "min_temp", "max_temp",
             "avg_humidity", "min_humidity", "max_humidity",
             "reading_count"]
        )

    year_col = func.extract("isoyear", RoomReading.recorded_at).label("year")
    week_col = func.extract("week", RoomReading.recorded_at).label("week")

    result = await db.execute(
        select(
            year_col,
            week_col,
            RoomReading.room_id,
            func.round(func.avg(RoomReading.co2_ppm), 1).label("avg_co2"),
            func.min(RoomReading.co2_ppm).label("min_co2"),
            func.max(RoomReading.co2_ppm).label("max_co2"),
            func.round(func.avg(RoomReading.room_temp), 2).label("avg_temp"),
            func.min(RoomReading.room_temp).label("min_temp"),
            func.max(RoomReading.room_temp).label("max_temp"),
            func.round(func.avg(RoomReading.room_humidity), 2).label("avg_humidity"),
            func.min(RoomReading.room_humidity).label("min_humidity"),
            func.max(RoomReading.room_humidity).label("max_humidity"),
            func.count().label("reading_count"),
        )
        .where(
            RoomReading.room_id.in_(room_ids),
            cast(RoomReading.recorded_at, Date) >= date_from,
            cast(RoomReading.recorded_at, Date) <= date_to,
        )
        .group_by(year_col, week_col, RoomReading.room_id)
        .order_by(year_col, week_col, RoomReading.room_id)
    )
    rows = result.all()

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow([
        "year", "week", "room_id", "room_name",
        "avg_co2", "min_co2", "max_co2",
        "avg_temp", "min_temp", "max_temp",
        "avg_humidity", "min_humidity", "max_humidity",
        "reading_count",
    ])
    for row in rows:
        writer.writerow([
            int(row.year), int(row.week),
            row.room_id,
            room_name_map.get(row.room_id, ""),
            row.avg_co2, row.min_co2, row.max_co2,
            row.avg_temp, row.min_temp, row.max_temp,
            row.avg_humidity, row.min_humidity, row.max_humidity,
            row.reading_count,
        ])
    return buf.getvalue()


# ---------------------------------------------------------------------------
# Alert Report
# ---------------------------------------------------------------------------

async def _alert_report(
    db: AsyncSession,
    room_ids: list[int],
    room_name_map: dict[int, str],
    date_from: date,
    date_to: date,
) -> str:
    """All alerts in the date range with severity, room, timestamps."""
    if not room_ids:
        return _empty_csv(
            ["alert_id", "room_id", "room_name", "alert_type", "severity",
             "parameter", "current_value", "threshold_value", "message",
             "is_resolved", "created_at", "resolved_at"]
        )

    result = await db.execute(
        select(Alert)
        .where(
            Alert.room_id.in_(room_ids),
            cast(Alert.created_at, Date) >= date_from,
            cast(Alert.created_at, Date) <= date_to,
        )
        .order_by(Alert.created_at.asc())
    )
    alerts = result.scalars().all()

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow([
        "alert_id", "room_id", "room_name", "alert_type", "severity",
        "parameter", "current_value", "threshold_value", "message",
        "is_resolved", "created_at", "resolved_at",
    ])
    for a in alerts:
        writer.writerow([
            a.alert_id,
            a.room_id,
            room_name_map.get(a.room_id, ""),
            a.alert_type.value if a.alert_type else "",
            a.severity.value if a.severity else "",
            a.parameter or "",
            a.current_value,
            a.threshold_value,
            a.message or "",
            a.is_resolved,
            str(a.created_at) if a.created_at else "",
            str(a.resolved_at) if a.resolved_at else "",
        ])
    return buf.getvalue()


# ---------------------------------------------------------------------------
# Harvest Report
# ---------------------------------------------------------------------------

async def _harvest_report(
    db: AsyncSession,
    room_ids: list[int],
    room_name_map: dict[int, str],
    date_from: date,
    date_to: date,
) -> str:
    """Harvest records with weights, grades, room names."""
    if not room_ids:
        return _empty_csv(
            ["harvest_id", "room_id", "room_name", "harvested_at",
             "weight_kg", "grade", "notes", "created_at"]
        )

    result = await db.execute(
        select(Harvest)
        .where(
            Harvest.room_id.in_(room_ids),
            cast(Harvest.harvested_at, Date) >= date_from,
            cast(Harvest.harvested_at, Date) <= date_to,
        )
        .order_by(Harvest.harvested_at.asc())
    )
    harvests = result.scalars().all()

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow([
        "harvest_id", "room_id", "room_name", "harvested_at",
        "weight_kg", "grade", "notes", "created_at",
    ])
    for h in harvests:
        writer.writerow([
            h.harvest_id,
            h.room_id,
            room_name_map.get(h.room_id, ""),
            str(h.harvested_at) if h.harvested_at else "",
            h.weight_kg,
            h.grade.value if h.grade else "",
            h.notes or "",
            str(h.created_at) if h.created_at else "",
        ])
    return buf.getvalue()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _empty_csv(headers: list[str]) -> str:
    """Return a CSV string with only headers (no data rows)."""
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(headers)
    return buf.getvalue()


async def stream_readings_csv(
    db: AsyncSession,
    room_id: int,
    date_from: date,
    date_to: date,
    limit: int = 50_000,
):
    """Yield CSV rows for room readings as an async generator (for StreamingResponse).

    Columns: timestamp, co2_ppm, room_temp, room_humidity, outdoor_temp,
             outdoor_humidity, bag_temp_1..bag_temp_10
    """
    headers = [
        "timestamp", "co2_ppm", "room_temp", "room_humidity",
        "outdoor_temp", "outdoor_humidity",
        "bag_temp_1", "bag_temp_2", "bag_temp_3", "bag_temp_4", "bag_temp_5",
        "bag_temp_6", "bag_temp_7", "bag_temp_8", "bag_temp_9", "bag_temp_10",
    ]

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(headers)
    yield buf.getvalue()

    result = await db.execute(
        select(RoomReading)
        .where(
            RoomReading.room_id == room_id,
            cast(RoomReading.recorded_at, Date) >= date_from,
            cast(RoomReading.recorded_at, Date) <= date_to,
        )
        .order_by(RoomReading.recorded_at.asc())
        .limit(limit)
    )
    readings = result.scalars().all()

    for r in readings:
        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerow([
            str(r.recorded_at),
            r.co2_ppm,
            r.room_temp,
            r.room_humidity,
            r.outdoor_temp,
            r.outdoor_humidity,
            r.bag_temp_1, r.bag_temp_2, r.bag_temp_3, r.bag_temp_4, r.bag_temp_5,
            r.bag_temp_6, r.bag_temp_7, r.bag_temp_8, r.bag_temp_9, r.bag_temp_10,
        ])
        yield buf.getvalue()
