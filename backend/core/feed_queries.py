"""
Database side of the activity feed

`core/feed.py` decides what deserves an event and what counts as a record.
This module turns those decisions into SQLAlchemy, and is the only place that
writes to `feed_events`

Emission is called from the workout and routine writers rather than from a
background job, so a finished workout appears in a follower's feed on the same
request that saved it. Every emission upserts on `dedupe_key`, which is what
makes that safe to call from an endpoint the offline queue retries
"""

from __future__ import annotations

from typing import Iterable, Optional, Sequence

from sqlalchemy.orm import Session

from core.feed import (
    EVENT_PERSONAL_RECORD,
    EVENT_ROUTINE_SHARED,
    EVENT_WORKOUT,
    best_efforts,
    build_record_title,
    build_routine_title,
    build_workout_title,
    completed_sets,
    dedupe_key,
    detect_records,
    workout_totals,
)
from core.social import VISIBILITY_PRIVATE, normalize_visibility
from models.feed import FeedComment, FeedEvent, FeedLike
from models.workouts import WorkoutSession, WorkoutSet

SUBJECT_SESSION = "workout_session"
SUBJECT_TEMPLATE = "workout_template"


def _upsert_event(
    db: Session,
    *,
    user_id: str,
    event_type: str,
    key: str,
    visibility: str,
    subject_type: Optional[str],
    subject_id: Optional[str],
    title: str,
    payload: dict,
    occurred_at,
) -> FeedEvent:
    """
    Write one event, replacing the existing row with the same key

    Editing in place rather than deleting and re-inserting keeps likes and
    comments attached. Someone who commented on a workout should not lose it
    because the author corrected the duration afterwards
    """
    event = (
        db.query(FeedEvent)
        .filter(FeedEvent.user_id == user_id, FeedEvent.dedupe_key == key)
        .first()
    )

    if event is None:
        event = FeedEvent(user_id=user_id, dedupe_key=key, event_type=event_type)
        db.add(event)

    event.event_type = event_type
    event.visibility = visibility
    event.subject_type = subject_type
    event.subject_id = subject_id
    event.title = title
    event.payload = payload
    if occurred_at is not None:
        event.occurred_at = occurred_at

    return event


def delete_events_for_subject(
    db: Session, user_id: str, subject_type: str, subject_id: str
) -> None:
    """
    Drop every event about one source row

    Called when a workout or routine is deleted. Leaving the event behind would
    put a card in followers' feeds that opens nothing
    """
    db.query(FeedEvent).filter(
        FeedEvent.user_id == user_id,
        FeedEvent.subject_type == subject_type,
        FeedEvent.subject_id == str(subject_id),
    ).delete(synchronize_session=False)


def previous_best_efforts(
    db: Session, user_id: str, exclude_session_id
) -> dict[str, dict]:
    """
    The user's strongest set per exercise before this session

    Read through `workout_sessions` rather than `workout_sets.user_id`: that
    column is typed `uuid` while every other table keys users as text, so
    joining on the session avoids the mismatch entirely
    """
    rows = (
        db.query(
            WorkoutSet.exercise_name,
            WorkoutSet.weight_kg,
            WorkoutSet.reps,
            WorkoutSet.set_type,
        )
        .join(WorkoutSession, WorkoutSession.id == WorkoutSet.session_id)
        .filter(
            WorkoutSession.user_id == user_id,
            WorkoutSession.id != exclude_session_id,
            WorkoutSet.completed.is_(True),
        )
        .all()
    )

    return best_efforts(
        [
            {
                "exercise": name,
                "weight_kg": weight,
                "reps": reps,
                "set_type": set_type,
            }
            for name, weight, reps, set_type in rows
        ]
    )


def emit_session_events(db: Session, session: WorkoutSession) -> list[FeedEvent]:
    """
    Publish a finished workout and any personal records it contained

    Only completed sessions produce events, so a live workout does not appear
    in the feed set by set. Private sessions still get a row: the author's own
    `me` timeline reads the same table, and `visible_content_filter` is what
    keeps the row out of everyone else's feed
    """
    if session is None or session.status != "completed":
        return []

    visibility = normalize_visibility(session.visibility, VISIBILITY_PRIVATE)
    occurred_at = session.end_time or session.start_time
    subject_id = str(session.id)

    totals = workout_totals(session.exercises)
    events = [
        _upsert_event(
            db,
            user_id=session.user_id,
            event_type=EVENT_WORKOUT,
            key=dedupe_key(EVENT_WORKOUT, subject_id),
            visibility=visibility,
            subject_type=SUBJECT_SESSION,
            subject_id=subject_id,
            title=build_workout_title(session.name),
            payload={
                "duration_seconds": session.duration_seconds or 0,
                "exercises": session.exercises or [],
                **totals,
            },
            occurred_at=occurred_at,
        )
    ]

    current = best_efforts(completed_sets(session.exercises))
    previous = previous_best_efforts(db, session.user_id, session.id)

    fresh_keys = set()
    for record in detect_records(current, previous):
        key = dedupe_key(EVENT_PERSONAL_RECORD, subject_id, record["exercise"])
        fresh_keys.add(key)
        events.append(
            _upsert_event(
                db,
                user_id=session.user_id,
                event_type=EVENT_PERSONAL_RECORD,
                key=key,
                visibility=visibility,
                subject_type=SUBJECT_SESSION,
                subject_id=subject_id,
                title=build_record_title(record),
                payload={**record, "session_name": build_workout_title(session.name)},
                occurred_at=occurred_at,
            )
        )

    _retract_stale_records(db, session.user_id, subject_id, fresh_keys)
    return events


def _retract_stale_records(
    db: Session, user_id: str, subject_id: str, fresh_keys: Iterable[str]
) -> None:
    """
    Remove record events this session no longer supports

    Editing a saved workout down, or unticking a set, has to be able to take a
    claimed PR back. Emission is a full replace for that reason, not an append
    """
    keep = set(fresh_keys)
    stale = (
        db.query(FeedEvent)
        .filter(
            FeedEvent.user_id == user_id,
            FeedEvent.event_type == EVENT_PERSONAL_RECORD,
            FeedEvent.subject_type == SUBJECT_SESSION,
            FeedEvent.subject_id == subject_id,
        )
        .all()
    )

    for event in stale:
        if event.dedupe_key not in keep:
            db.delete(event)


def emit_template_event(db: Session, template) -> Optional[FeedEvent]:
    """
    Publish a routine when it is shared, and retract it when it is not

    A routine that goes back to private should leave the feed, which is why the
    private case deletes rather than simply skipping
    """
    if template is None:
        return None

    visibility = normalize_visibility(template.visibility, VISIBILITY_PRIVATE)
    subject_id = str(template.id)

    if visibility == VISIBILITY_PRIVATE:
        delete_events_for_subject(db, template.user_id, SUBJECT_TEMPLATE, subject_id)
        return None

    return _upsert_event(
        db,
        user_id=template.user_id,
        event_type=EVENT_ROUTINE_SHARED,
        key=dedupe_key(EVENT_ROUTINE_SHARED, subject_id),
        visibility=visibility,
        subject_type=SUBJECT_TEMPLATE,
        subject_id=subject_id,
        title=build_routine_title(template.name),
        payload={
            "routine_name": (template.name or "").strip(),
            "exercise_count": len(template.exercises or []),
            "exercises": template.exercises or [],
        },
        occurred_at=template.created_at,
    )


def recount_engagement(db: Session, event_ids: Sequence) -> None:
    """
    Recompute the denormalised like and comment counters

    Recomputed rather than incremented, for the same reason the follow counters
    are: a like, unlike, comment, delete and a cascaded account deletion all
    move them, and drift is hard to notice
    """
    for event_id in {eid for eid in event_ids if eid}:
        event = db.query(FeedEvent).filter(FeedEvent.id == event_id).first()
        if not event:
            continue

        event.like_count = (
            db.query(FeedLike.id).filter(FeedLike.event_id == event_id).count()
        )
        event.comment_count = (
            db.query(FeedComment.id).filter(FeedComment.event_id == event_id).count()
        )
