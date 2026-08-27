import uuid

from sqlalchemy import (
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Index,
    String,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from core.database import Base
from core.social import FOLLOW_ACCEPTED, FOLLOW_PENDING


class Follow(Base):
    """
    One directed edge of the follow graph

    A single row covers both a request and an accepted follow. Following a
    public account inserts a row with status 'accepted'; following a private
    account inserts 'pending' and the target approves it later. Keeping the
    request on the same row means approving is an UPDATE, and it makes
    "is this viewer a follower" a single lookup
    """

    __tablename__ = "follows"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    follower_id = Column(
        String, ForeignKey("user_profiles.id", ondelete="CASCADE"), nullable=False
    )
    following_id = Column(
        String, ForeignKey("user_profiles.id", ondelete="CASCADE"), nullable=False
    )
    status = Column(String, nullable=False, default=FOLLOW_ACCEPTED)

    created_at = Column(DateTime(timezone=True), default=func.now())
    responded_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        UniqueConstraint("follower_id", "following_id", name="uq_follow_pair"),
        CheckConstraint("follower_id <> following_id", name="ck_follow_not_self"),
        CheckConstraint(
            f"status in ('{FOLLOW_PENDING}', '{FOLLOW_ACCEPTED}')",
            name="ck_follow_status",
        ),
        # Feed reads walk the following side, profile lists walk the follower side
        Index("ix_follows_following_status", "following_id", "status"),
        Index("ix_follows_follower_status", "follower_id", "status"),
    )


class UserBlock(Base):
    """
    A one-way block that is enforced in both directions on read

    Blocks live apart from the follow graph because they are not a follow
    state: a block must survive an unfollow, and it must hide content from a
    user who never followed in the first place
    """

    __tablename__ = "user_blocks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    blocker_id = Column(
        String, ForeignKey("user_profiles.id", ondelete="CASCADE"), nullable=False
    )
    blocked_id = Column(
        String, ForeignKey("user_profiles.id", ondelete="CASCADE"), nullable=False
    )
    created_at = Column(DateTime(timezone=True), default=func.now())

    __table_args__ = (
        UniqueConstraint("blocker_id", "blocked_id", name="uq_block_pair"),
        CheckConstraint("blocker_id <> blocked_id", name="ck_block_not_self"),
        Index("ix_user_blocks_blocked", "blocked_id"),
    )
