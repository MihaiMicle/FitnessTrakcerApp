"""
Handing the app's own data back out to a health store

The write direction is only reachable from a native build, because neither
HealthKit nor Health Connect can be written from a browser. The server side is
identical either way: it says what should be written and the device does the
writing, so adding a second platform later needs no work here

Every item carries an `export_key` that is stable for the row it came from.
The device stores the keys it has written, which is what stops a repeated
export from creating a second copy of the same workout in the health store
"""

from datetime import datetime, timezone
from typing import List, Optional

from fastapi import Depends, Query
from sqlalchemy.orm import Session

from core.database import get_db
from core.health import (
    WRITABLE_METRICS,
    direction_allows_write,
    normalize_enabled_metrics,
)
from core.security import get_current_user
from models.nutrition import DailyLog
from models.profile import WeightLog
from models.workouts import WorkoutSession
from schemas.health import HealthExportAck, HealthExportItem, HealthExportResponse

from .common import default_window_start, health_router, require_connection

router = health_router()

# Which DailyLog column feeds which metric
NUTRITION_FIELDS = (
    ("water_ml", "total_water_ml"),
    ("energy_intake_kcal", "total_calories"),
    ("protein_g", "total_protein_g"),
    ("carbs_g", "total_carbs_g"),
    ("fat_g", "total_fats_g"),
)


def _writable_metrics(connection) -> set:
    if not direction_allows_write(connection.direction):
        return set()
    chosen = normalize_enabled_metrics(connection.enabled_metrics)
    allowed = set(chosen) if chosen else set(WRITABLE_METRICS)
    return allowed & set(WRITABLE_METRICS)


def _aware(moment: Optional[datetime]) -> Optional[datetime]:
    if moment is None:
        return None
    return moment if moment.tzinfo else moment.replace(tzinfo=timezone.utc)


def _day_bounds(day):
    start = datetime(day.year, day.month, day.day, tzinfo=timezone.utc)
    return start, start.replace(hour=23, minute=59, second=59)


@router.get("/export", response_model=HealthExportResponse)
def export_for_device(
    provider: str,
    since: Optional[datetime] = None,
    limit: int = Query(500, ge=1, le=2000),
    current_user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    What the device should write into the health store

    `since` defaults to the connection's own cursor so a device that lost its
    local state asks for the right window without having to know one
    """
    connection = require_connection(db, current_user_id, provider)
    metrics = _writable_metrics(connection)
    if not metrics:
        return HealthExportResponse(items=[], cursor=_aware(connection.last_export_at))

    window_start = (
        _aware(since) or _aware(connection.last_export_at) or default_window_start()
    )

    items: List[HealthExportItem] = []

    if "weight_kg" in metrics:
        items.extend(_weight_items(db, current_user_id, window_start, limit))

    if "workout_minutes" in metrics:
        items.extend(_workout_items(db, current_user_id, window_start, limit))

    nutrition = [metric for metric, _ in NUTRITION_FIELDS if metric in metrics]
    if nutrition:
        items.extend(_nutrition_items(db, current_user_id, window_start, nutrition, limit))

    items.sort(key=lambda item: item.start_at)
    items = items[:limit]
    cursor = items[-1].start_at if items else window_start

    return HealthExportResponse(items=items, cursor=cursor)


def _weight_items(db: Session, user_id: str, since: datetime, limit: int):
    logs = (
        db.query(WeightLog)
        .filter(WeightLog.user_id == user_id, WeightLog.date >= since.date())
        .order_by(WeightLog.date.asc())
        .limit(limit)
        .all()
    )
    out = []
    for log in logs:
        start, end = _day_bounds(log.date)
        out.append(
            HealthExportItem(
                export_key=f"weight:{log.id}",
                metric="weight_kg",
                value=float(log.weight_kg),
                unit="kg",
                start_at=start,
                end_at=start,
            )
        )
    return out


def _workout_items(db: Session, user_id: str, since: datetime, limit: int):
    sessions = (
        db.query(WorkoutSession)
        .filter(
            WorkoutSession.user_id == user_id,
            WorkoutSession.start_time >= since,
            WorkoutSession.status == "completed",
        )
        .order_by(WorkoutSession.start_time.asc())
        .limit(limit)
        .all()
    )

    out = []
    for session in sessions:
        start = _aware(session.start_time)
        if start is None:
            continue
        minutes = (session.duration_seconds or 0) / 60.0
        end = _aware(session.end_time)
        if end is None:
            end = start

        # A zero length workout is a session that was started and abandoned,
        # and writing it out would clutter the health store with noise
        if minutes <= 0:
            continue

        out.append(
            HealthExportItem(
                export_key=f"workout:{session.id}",
                metric="workout_minutes",
                value=minutes,
                unit="min",
                start_at=start,
                end_at=end,
                payload={
                    "name": session.name,
                    "activity_type": "strength_training",
                    "exercise_count": len(session.exercises or []),
                },
            )
        )
    return out


def _nutrition_items(
    db: Session, user_id: str, since: datetime, metrics: List[str], limit: int
):
    logs = (
        db.query(DailyLog)
        .filter(DailyLog.user_id == user_id, DailyLog.date >= since.date())
        .order_by(DailyLog.date.asc())
        .limit(limit)
        .all()
    )

    units = {
        "water_ml": "ml",
        "energy_intake_kcal": "kcal",
        "protein_g": "g",
        "carbs_g": "g",
        "fat_g": "g",
    }

    out = []
    for log in logs:
        start, end = _day_bounds(log.date)
        for metric, column in NUTRITION_FIELDS:
            if metric not in metrics:
                continue
            value = getattr(log, column, None) or 0
            if value <= 0:
                continue
            out.append(
                HealthExportItem(
                    export_key=f"nutrition:{log.id}:{metric}",
                    metric=metric,
                    value=float(value),
                    unit=units[metric],
                    start_at=start,
                    end_at=end,
                )
            )
    return out


@router.post("/export/ack", response_model=HealthExportResponse)
def acknowledge_export(
    payload: HealthExportAck,
    current_user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Move the write cursor after the device confirms it wrote the batch

    Acknowledging separately is what makes a failed write recoverable: an app
    killed halfway through simply asks for the same window again
    """
    connection = require_connection(db, current_user_id, payload.provider)

    written = _aware(payload.written_through)
    current = _aware(connection.last_export_at)
    if current is None or (written and written > current):
        connection.last_export_at = written

    db.commit()
    return HealthExportResponse(items=[], cursor=_aware(connection.last_export_at))
