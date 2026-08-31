import uuid
from sqlalchemy import (
    Column,
    String,
    Float,
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func

from core.database import Base
from core.health import DIRECTION_READ


class HealthConnection(Base):
    """
    One health data source a user has linked

    A connection is per provider rather than per device because that is the
    unit a user grants permission to. `direction` and `enabled_metrics` are
    the user's consent, and the ingest and export endpoints both refuse work
    that falls outside them, so revoking a metric here is enough to stop it
    moving in either direction

    `user_id` uses `UUID(as_uuid=False)` rather than the `String` every other
    table in this codebase declares. The real `user_profiles.id` column is
    uuid, and Postgres coerces the string parameters SQLAlchemy sends, which
    is why `String` works for queries. It does not work for a foreign key: the
    declared types have to match, and text will not reference uuid, so
    `create_all` could not create this table at all

    `as_uuid=False` keeps the Python side handing back plain strings, so every
    caller passes and reads a `str` exactly as it does for `weight_logs`
    """

    __tablename__ = "health_connections"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=False),
        ForeignKey("user_profiles.id", ondelete="CASCADE"),
        nullable=False,
    )

    provider = Column(String, nullable=False)
    direction = Column(String, nullable=False, default=DIRECTION_READ)
    enabled_metrics = Column(JSONB, nullable=False, default=list)

    is_active = Column(Boolean, nullable=False, default=True)

    # Which platform the connection was made from, for support and for telling
    # a user why their phone's connection is not visible in the browser
    device_platform = Column(String, nullable=True)
    device_name = Column(String, nullable=True)

    # Read and write cursors, so a sync asks for a window instead of everything
    last_import_at = Column(DateTime(timezone=True), nullable=True)
    last_export_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), default=func.now())
    updated_at = Column(
        DateTime(timezone=True), default=func.now(), onupdate=func.now()
    )

    __table_args__ = (
        UniqueConstraint("user_id", "provider", name="uq_health_connections_user_provider"),
    )


class HealthSample(Base):
    """
    One normalized measurement read from a health store

    Samples are kept raw rather than folded straight into weight logs and
    daily totals. Keeping them means a projection can be recomputed after a
    mapping bug, and a disconnect can delete exactly what one provider
    contributed without touching anything the user typed by hand

    `external_id` is the provider's own record id where there is one and a
    content hash otherwise, and the unique constraint on it is what makes an
    interrupted sync safe to replay
    """

    __tablename__ = "health_samples"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=False),
        ForeignKey("user_profiles.id", ondelete="CASCADE"),
        nullable=False,
    )

    provider = Column(String, nullable=False)
    external_id = Column(String, nullable=False)

    metric = Column(String, nullable=False)
    value = Column(Float, nullable=False)
    unit = Column(String, nullable=False)

    start_at = Column(DateTime(timezone=True), nullable=False)
    end_at = Column(DateTime(timezone=True), nullable=False)

    source_name = Column(String, nullable=True)
    payload = Column(JSONB, nullable=True)

    created_at = Column(DateTime(timezone=True), default=func.now())

    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "provider",
            "external_id",
            name="uq_health_samples_identity",
        ),
        Index("ix_health_samples_user_metric_start", "user_id", "metric", "start_at"),
    )
