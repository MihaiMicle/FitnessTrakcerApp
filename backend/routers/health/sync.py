"""
Taking a batch of samples in, whatever read it

This is the endpoint the native plugin posts to, the endpoint the file import
funnels into, and the endpoint a future cloud provider would use. Because the
batch is normalized before it is stored, none of them need their own write
path and the browser and the phone stay interchangeable
"""

from datetime import datetime, timezone
from typing import List, Optional

from fastapi import Depends, Query
from sqlalchemy.orm import Session

from core.database import get_db
from core.health import METRICS, normalize_batch, reduce_daily
from core.security import get_current_user
from models.health import HealthSample
from schemas.health import (
    HealthDailyPoint,
    HealthSampleResponse,
    HealthSyncRequest,
    HealthSyncResponse,
)

from .common import (
    apply_samples,
    assert_provider,
    ensure_connection,
    health_router,
    readable_metrics,
    store_samples,
    touch_import_cursor,
)

router = health_router()

# One sync window, so a device with years of history pages instead of sending
# a request large enough to time out on the way in
MAX_BATCH = 5000


@router.post("/sync", response_model=HealthSyncResponse)
def sync_samples(
    payload: HealthSyncRequest,
    current_user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Store a batch of health samples and fold the mirrored ones into the app

    Replaying a batch is safe. Each sample carries the provider's own record
    id, or a hash of its contents when the provider has none, so a sync that
    times out after writing can be sent again without duplicating anything
    """
    provider = assert_provider(payload.provider)
    connection = ensure_connection(db, current_user_id, provider)

    allowed = readable_metrics(connection)
    rows, skipped = normalize_batch(
        [sample.model_dump() for sample in payload.samples[:MAX_BATCH]], provider
    )

    # A metric the user switched off is dropped here rather than at the device,
    # because the consent that matters is the one stored on the account
    kept = [row for row in rows if row["metric"] in allowed]
    skipped += len(rows) - len(kept)
    skipped += max(0, len(payload.samples) - MAX_BATCH)

    stored, duplicates = store_samples(db, current_user_id, kept)
    applied = apply_samples(db, current_user_id, stored)
    cursor = touch_import_cursor(connection, payload.synced_through)

    db.commit()

    return HealthSyncResponse(
        accepted=len(stored) - duplicates,
        duplicates=duplicates,
        skipped=skipped,
        applied=applied,
        last_import_at=cursor,
    )


@router.get("/samples", response_model=List[HealthSampleResponse])
def list_samples(
    metric: Optional[str] = None,
    start: Optional[datetime] = None,
    end: Optional[datetime] = None,
    limit: int = Query(500, ge=1, le=2000),
    current_user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Raw samples, newest first, for charting and for debugging a sync"""
    query = db.query(HealthSample).filter(HealthSample.user_id == current_user_id)

    if metric in METRICS:
        query = query.filter(HealthSample.metric == metric)
    if start:
        query = query.filter(HealthSample.start_at >= start)
    if end:
        query = query.filter(HealthSample.start_at <= end)

    return query.order_by(HealthSample.start_at.desc()).limit(limit).all()


@router.get("/daily", response_model=List[HealthDailyPoint])
def daily_summary(
    metric: str,
    start: Optional[datetime] = None,
    end: Optional[datetime] = None,
    current_user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    One value per day for a metric, reduced the way that metric wants

    Steps add up across a day, a weight reading does not, and a heart rate
    averages. Doing the reduction here keeps every client from reimplementing
    that table and disagreeing about it
    """
    if metric not in METRICS:
        return []

    query = db.query(HealthSample).filter(
        HealthSample.user_id == current_user_id,
        HealthSample.metric == metric,
    )
    if start:
        query = query.filter(HealthSample.start_at >= start)
    if end:
        query = query.filter(HealthSample.start_at <= end)

    buckets: dict = {}
    for sample in query.order_by(HealthSample.start_at.asc()).all():
        moment = sample.start_at
        if moment.tzinfo is None:
            moment = moment.replace(tzinfo=timezone.utc)
        buckets.setdefault(moment.astimezone(timezone.utc).date(), []).append(
            sample.value
        )

    unit = METRICS[metric][1]
    points = []
    for day in sorted(buckets):
        value = reduce_daily(metric, buckets[day])
        if value is not None:
            points.append(
                HealthDailyPoint(day=day, metric=metric, value=value, unit=unit)
            )
    return points
