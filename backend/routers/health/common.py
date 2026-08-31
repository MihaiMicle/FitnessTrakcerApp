"""
The parts of the health API that touch the database

Everything that can be decided without a connection lives in `core/health.py`
and is unit tested there. This module is the thin layer that turns those
decisions into rows
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Iterable, Optional

from fastapi import APIRouter, HTTPException
from sqlalchemy.orm import Session

from core.health import (
    DIRECTION_READ,
    METRICS,
    PROVIDERS,
    direction_allows_read,
    normalize_direction,
    normalize_enabled_metrics,
)
from models.health import HealthConnection, HealthSample
from models.profile import UserProfile, WeightLog

# Samples that are folded into an app table rather than only being charted
#
# The list is short on purpose. Nutrition is not here because the meal log is
# the source of truth for it and a projection would fight what the user typed,
# and workouts are not here because a treadmill session read off a watch
# should not appear in the strength history as if it had been logged in the
# app. Both still flow outward through the export endpoint
PROJECTED_METRICS = ("weight_kg", "body_fat_percent", "height_cm", "water_ml")


def health_router() -> APIRouter:
    """A router carrying the shared prefix, so every module registers the same one"""
    return APIRouter(prefix="/health", tags=["Health Data"])


def assert_provider(provider: str) -> str:
    if provider not in PROVIDERS:
        raise HTTPException(status_code=400, detail=f"Unknown provider '{provider}'")
    return provider


def get_connection(
    db: Session, user_id: str, provider: str
) -> Optional[HealthConnection]:
    return (
        db.query(HealthConnection)
        .filter(
            HealthConnection.user_id == user_id,
            HealthConnection.provider == provider,
        )
        .first()
    )


def require_connection(db: Session, user_id: str, provider: str) -> HealthConnection:
    connection = get_connection(db, user_id, provider)
    if not connection or not connection.is_active:
        raise HTTPException(
            status_code=404, detail=f"No active {provider} connection"
        )
    return connection


def readable_metrics(connection: HealthConnection) -> set[str]:
    """
    Which metrics this connection is allowed to bring in

    An empty `enabled_metrics` means every metric, so a device that connected
    before a new metric existed keeps working instead of silently ignoring it
    """
    if not direction_allows_read(connection.direction):
        return set()
    chosen = normalize_enabled_metrics(connection.enabled_metrics)
    return set(chosen) if chosen else set(METRICS)


def store_samples(
    db: Session, user_id: str, rows: Iterable[dict]
) -> tuple[list[HealthSample], int]:
    """
    Insert what is new and update what already exists

    The read then write is two queries rather than one upsert so the code does
    not depend on the Postgres dialect, which keeps it runnable against the
    SQLite database the tests use. Batches are one sync window, so the extra
    round trip costs nothing worth optimising
    """
    rows = list(rows)
    if not rows:
        return [], 0

    provider = rows[0]["provider"]
    ids = [row["external_id"] for row in rows]

    existing = {
        sample.external_id: sample
        for sample in db.query(HealthSample)
        .filter(
            HealthSample.user_id == user_id,
            HealthSample.provider == provider,
            HealthSample.external_id.in_(ids),
        )
        .all()
    }

    touched: list[HealthSample] = []
    duplicates = 0

    for row in rows:
        sample = existing.get(row["external_id"])
        if sample is not None:
            duplicates += 1
            # A provider may correct a record it already sent, so take the
            # newer values rather than skipping the row outright
            sample.value = row["value"]
            sample.unit = row["unit"]
            sample.start_at = row["start_at"]
            sample.end_at = row["end_at"]
            sample.source_name = row["source_name"]
            sample.payload = row["payload"]
        else:
            sample = HealthSample(user_id=user_id, **row)
            db.add(sample)
        touched.append(sample)

    return touched, duplicates


def _day_of(moment: datetime):
    return moment.astimezone(timezone.utc).date()


def apply_samples(
    db: Session, user_id: str, samples: Iterable[HealthSample]
) -> dict[str, int]:
    """
    Fold the metrics we mirror into the tables the rest of the app reads

    Only the newest sample per day is considered for the body measurements,
    and a day the user already logged by hand is left alone. A number someone
    typed in the app is a deliberate act and a background sync should never
    quietly replace it
    """
    by_metric: dict[str, list[HealthSample]] = {}
    for sample in samples:
        if sample.metric in PROJECTED_METRICS:
            by_metric.setdefault(sample.metric, []).append(sample)

    if not by_metric:
        return {}

    profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    applied: dict[str, int] = {}

    weights = sorted(by_metric.get("weight_kg", []), key=lambda s: s.start_at)
    if weights:
        applied["weight_kg"] = _apply_weights(db, user_id, profile, weights)

    for metric, field in (
        ("body_fat_percent", "body_fat_percentage"),
        ("height_cm", "height_cm"),
    ):
        entries = sorted(by_metric.get(metric, []), key=lambda s: s.start_at)
        if entries and profile:
            setattr(profile, field, round(entries[-1].value, 2))
            applied[metric] = 1

    water = by_metric.get("water_ml", [])
    if water:
        applied["water_ml"] = _apply_water(db, user_id, water)

    return applied


def _apply_weights(
    db: Session, user_id: str, profile: Optional[UserProfile], samples: list
) -> int:
    """One weight log per day, for the days the user has not filled in"""
    per_day = {_day_of(sample.start_at): sample for sample in samples}

    already_logged = {
        log.date
        for log in db.query(WeightLog)
        .filter(WeightLog.user_id == user_id, WeightLog.date.in_(list(per_day)))
        .all()
    }

    written = 0
    for day, sample in sorted(per_day.items()):
        if day in already_logged:
            continue
        db.add(
            WeightLog(
                user_id=user_id,
                date=day,
                weight_kg=round(sample.value, 2),
            )
        )
        written += 1

    # The profile carries the current weight the macro formula reads, so it
    # follows the most recent measurement whatever the source
    if written and profile:
        latest = per_day[max(per_day)]
        profile.weight_kg = round(latest.value, 2)

    return written


def _apply_water(db: Session, user_id: str, samples: list) -> int:
    """
    Health water tops up the day's total, it never lowers it

    The app also writes water out to the health store, so a naive sum would
    grow on every round trip. Taking the larger of the two totals is stable
    under repeated syncing in a way that adding is not
    """
    from models.nutrition import DailyLog

    totals: dict = {}
    for sample in samples:
        day = _day_of(sample.start_at)
        totals[day] = totals.get(day, 0.0) + sample.value

    logs = {
        log.date: log
        for log in db.query(DailyLog)
        .filter(DailyLog.user_id == user_id, DailyLog.date.in_(list(totals)))
        .all()
    }

    written = 0
    for day, total in totals.items():
        log = logs.get(day)
        if log is None:
            log = DailyLog(user_id=user_id, date=day, total_water_ml=int(total))
            db.add(log)
            written += 1
            continue
        if int(total) > int(log.total_water_ml or 0):
            log.total_water_ml = int(total)
            written += 1

    return written


def ensure_connection(
    db: Session, user_id: str, provider: str, platform: Optional[str] = None
) -> HealthConnection:
    """
    The connection for a provider, created read only if it is not there yet

    A file import is a one off and asking the user to press connect before
    they can upload would be ceremony for its own sake, so the upload creates
    the record it needs
    """
    connection = get_connection(db, user_id, provider)
    if connection:
        return connection

    connection = HealthConnection(
        user_id=user_id,
        provider=provider,
        direction=DIRECTION_READ,
        enabled_metrics=[],
        device_platform=platform,
    )
    db.add(connection)
    db.flush()
    return connection


def touch_import_cursor(
    connection: HealthConnection, synced_through: Optional[datetime]
) -> datetime:
    """
    Move the read cursor, never backwards

    A device syncing an old window must not rewind a cursor a newer sync
    already advanced, or the next read replays everything in between
    """
    moment = synced_through or datetime.now(timezone.utc)
    if moment.tzinfo is None:
        moment = moment.replace(tzinfo=timezone.utc)

    current = connection.last_import_at
    if current is not None and current.tzinfo is None:
        current = current.replace(tzinfo=timezone.utc)

    if current is None or moment > current:
        connection.last_import_at = moment
    return connection.last_import_at


def default_window_start() -> datetime:
    """
    Where a first sync starts when the device gives no cursor

    Health Connect only exposes the thirty days before permission was granted,
    so asking for more than that is pointless on Android and generous enough
    on iOS for a first import
    """
    return datetime.now(timezone.utc) - timedelta(days=30)


__all__ = [
    "apply_samples",
    "assert_provider",
    "default_window_start",
    "ensure_connection",
    "get_connection",
    "health_router",
    "normalize_direction",
    "PROJECTED_METRICS",
    "readable_metrics",
    "require_connection",
    "store_samples",
    "touch_import_cursor",
]
