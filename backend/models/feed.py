import uuid

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.sql import func

from core.database import Base
from core.social import VISIBILITY_PRIVATE


class FeedEvent(Base):
    """
    One thing a user did that other people may care about

    The feed is fanned out on read, not on write: an activity is stored once
    against its author and the reader's query walks their following list. A
    per-follower inbox would be faster to read but would need a backfill on
    every new follow and a sweep on every unfollow, and this app's graph is
    small enough that the join is cheap

    `payload` is denormalised on purpose. A card renders from the event alone,
    so listing a page of twenty does not become twenty joins back to sessions
    """

    __tablename__ = "feed_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # user_profiles.id is a uuid column, so this has to emit uuid in the DDL or
    # the foreign key cannot be created. as_uuid=False keeps the Python-side
    # value a plain string, which is what get_current_user hands the routers
    user_id = Column(
        UUID(as_uuid=False),
        ForeignKey("user_profiles.id", ondelete="CASCADE"),
        nullable=False,
    )

    event_type = Column(String, nullable=False)

    # Mirrors the source row's visibility so the feed can be filtered with the
    # same clause as any other content, and clamped by the owner's is_private
    visibility = Column(String, nullable=False, default=VISIBILITY_PRIVATE)

    # What the event is about, kept loose because subjects live in three tables
    subject_type = Column(String, nullable=True)
    subject_id = Column(String, nullable=True)

    # Stable identity for the activity, unique per user. Emission upserts on it
    # so a replayed offline save edits one event instead of posting a duplicate
    dedupe_key = Column(String, nullable=False)

    title = Column(String, nullable=False)
    payload = Column(JSONB, default=dict)

    # Recomputed rather than incremented, the same way follow counters are
    like_count = Column(Integer, nullable=False, default=0)
    comment_count = Column(Integer, nullable=False, default=0)

    # When the activity happened, which is not when the row was written. An
    # offline workout logged on Monday and synced on Wednesday sorts to Monday
    occurred_at = Column(DateTime(timezone=True), nullable=False, default=func.now())
    created_at = Column(DateTime(timezone=True), default=func.now())

    __table_args__ = (
        UniqueConstraint("user_id", "dedupe_key", name="uq_feed_event_dedupe"),
        # Keyset pagination reads (occurred_at, id) for a set of authors
        Index("ix_feed_events_user_occurred", "user_id", "occurred_at"),
        Index("ix_feed_events_visibility_occurred", "visibility", "occurred_at"),
    )


class FeedLike(Base):
    """
    One user's like on one event

    A row rather than a counter column so liking twice is a no-op and the
    viewer's own like state can be resolved without a second source of truth
    """

    __tablename__ = "feed_likes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id = Column(
        UUID(as_uuid=True),
        ForeignKey("feed_events.id", ondelete="CASCADE"),
        nullable=False,
    )
    # user_profiles.id is a uuid column, so this has to emit uuid in the DDL or
    # the foreign key cannot be created. as_uuid=False keeps the Python-side
    # value a plain string, which is what get_current_user hands the routers
    user_id = Column(
        UUID(as_uuid=False),
        ForeignKey("user_profiles.id", ondelete="CASCADE"),
        nullable=False,
    )
    created_at = Column(DateTime(timezone=True), default=func.now())

    __table_args__ = (
        UniqueConstraint("event_id", "user_id", name="uq_feed_like_pair"),
        Index("ix_feed_likes_event", "event_id"),
    )


class FeedComment(Base):
    """A comment on an event, readable by anyone who can read the event"""

    __tablename__ = "feed_comments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id = Column(
        UUID(as_uuid=True),
        ForeignKey("feed_events.id", ondelete="CASCADE"),
        nullable=False,
    )
    # user_profiles.id is a uuid column, so this has to emit uuid in the DDL or
    # the foreign key cannot be created. as_uuid=False keeps the Python-side
    # value a plain string, which is what get_current_user hands the routers
    user_id = Column(
        UUID(as_uuid=False),
        ForeignKey("user_profiles.id", ondelete="CASCADE"),
        nullable=False,
    )
    body = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=func.now())

    __table_args__ = (Index("ix_feed_comments_event_created", "event_id", "created_at"),)
