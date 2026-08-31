"""
Linking, configuring and revoking a health data source

A connection is the user's consent record. Every other endpoint reads it
before moving anything, so this is the one place that has to be right
"""

from typing import List

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from core.database import get_db
from core.health import (
    METRICS,
    PROVIDERS,
    WRITABLE_METRICS,
    normalize_direction,
    normalize_enabled_metrics,
)
from core.security import get_current_user
from models.health import HealthConnection, HealthSample
from schemas.health import HealthConnectionResponse, HealthConnectionUpsert

from .common import assert_provider, get_connection, health_router

router = health_router()


@router.get("/metrics")
def list_metrics():
    """
    The vocabulary the client should render toggles from

    Serving it rather than hardcoding it in the frontend means adding a metric
    is a backend change and old app builds keep working
    """
    return {
        "providers": list(PROVIDERS),
        "metrics": [
            {
                "key": key,
                "unit": unit,
                "dimension": dimension,
                "writable": key in WRITABLE_METRICS,
            }
            for key, (dimension, unit, _) in METRICS.items()
        ],
    }


@router.get("/connections", response_model=List[HealthConnectionResponse])
def list_connections(
    current_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Every source this user has linked, on any device"""
    return (
        db.query(HealthConnection)
        .filter(HealthConnection.user_id == current_user_id)
        .order_by(HealthConnection.created_at.asc())
        .all()
    )


@router.put("/connections", response_model=HealthConnectionResponse)
def upsert_connection(
    payload: HealthConnectionUpsert,
    current_user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create or update the connection for one provider

    Upsert rather than post because the client already knows the provider it
    is configuring, so a repeated call from a phone that reinstalled the app
    updates the existing consent instead of failing on the unique constraint
    """
    provider = assert_provider(payload.provider)
    connection = get_connection(db, current_user_id, provider)

    if connection is None:
        connection = HealthConnection(user_id=current_user_id, provider=provider)
        db.add(connection)

    if payload.direction is not None:
        connection.direction = normalize_direction(payload.direction)
    if payload.enabled_metrics is not None:
        connection.enabled_metrics = normalize_enabled_metrics(payload.enabled_metrics)
    if payload.is_active is not None:
        connection.is_active = payload.is_active
    if payload.device_platform is not None:
        connection.device_platform = payload.device_platform
    if payload.device_name is not None:
        connection.device_name = payload.device_name

    db.commit()
    db.refresh(connection)
    return connection


@router.delete("/connections/{provider}", status_code=status.HTTP_204_NO_CONTENT)
def delete_connection(
    provider: str,
    purge: bool = True,
    current_user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Disconnect a source, deleting what it contributed by default

    Keeping raw samples per provider is what makes this possible: revoking
    Apple Health removes exactly the rows Apple Health sent and leaves the
    weight logs the user typed untouched. That is also the deletion right the
    user has over data they never entered here in the first place
    """
    assert_provider(provider)
    connection = get_connection(db, current_user_id, provider)
    if not connection:
        raise HTTPException(status_code=404, detail="Connection not found")

    if purge:
        db.query(HealthSample).filter(
            HealthSample.user_id == current_user_id,
            HealthSample.provider == provider,
        ).delete(synchronize_session=False)

    db.delete(connection)
    db.commit()
    return None
