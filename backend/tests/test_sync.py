"""
Tests for the rules that let the offline queue write safely

The session id is generated on the phone, so `PUT /workouts/{id}` has to be able
to create the row it is updating. These are the parts of that decision that need
no database: what a client is allowed to set, and what gets filled in when the
payload was written offline and left something out

`core/sync.py` imports nothing from the app, so none of this needs a connection
"""

from datetime import datetime, timezone
from uuid import UUID, uuid4

import pytest

from core.sync import (
    CREATABLE_FIELDS,
    DEFAULT_NAME,
    DEFAULT_STATUS,
    creation_defaults,
    normalize_client_id,
)

NOW = datetime(2026, 8, 28, 12, 0, tzinfo=timezone.utc)


class TestNormalizeClientId:
    def test_accepts_a_uuid_object(self):
        value = uuid4()
        assert normalize_client_id(value) is value

    def test_accepts_a_uuid_string(self):
        text = "3f2504e0-4f89-41d3-9a0c-0305e82c3301"
        assert normalize_client_id(text) == UUID(text)

    @pytest.mark.parametrize(
        "value",
        ["", "local-12345", "not-a-uuid", None, 42, [], {}],
    )
    def test_rejects_anything_else(self, value):
        assert normalize_client_id(value) is None


class TestCreationDefaults:
    def test_keeps_what_the_client_sent(self):
        data = creation_defaults(
            {
                "name": "Push Day",
                "status": "completed",
                "duration_seconds": 3600,
                "exercises": [{"name": "Bench Press"}],
            },
            NOW,
        )

        assert data["name"] == "Push Day"
        assert data["status"] == "completed"
        assert data["duration_seconds"] == 3600
        assert data["exercises"] == [{"name": "Bench Press"}]

    def test_fills_a_start_time_so_the_session_can_be_ordered(self):
        assert creation_defaults({}, NOW)["start_time"] == NOW

    def test_keeps_the_real_start_time_of_an_offline_workout(self):
        started = datetime(2026, 8, 28, 6, 30, tzinfo=timezone.utc)
        data = creation_defaults({"start_time": started}, NOW)
        assert data["start_time"] == started

    def test_defaults_an_empty_payload(self):
        data = creation_defaults({}, NOW)

        assert data["name"] == DEFAULT_NAME
        assert data["status"] == DEFAULT_STATUS
        assert data["duration_seconds"] == 0
        assert data["exercises"] == []

    def test_replaces_nulls_rather_than_storing_them(self):
        data = creation_defaults(
            {
                "name": None,
                "status": None,
                "duration_seconds": None,
                "exercises": None,
            },
            NOW,
        )

        assert data["name"] == DEFAULT_NAME
        assert data["status"] == DEFAULT_STATUS
        assert data["duration_seconds"] == 0
        assert data["exercises"] == []

    def test_ignores_fields_a_client_may_not_set(self):
        data = creation_defaults(
            {"user_id": "someone-else", "id": "spoofed", "created_at": NOW}, NOW
        )

        assert "user_id" not in data
        assert "id" not in data
        assert "created_at" not in data

    def test_leaves_visibility_alone_for_the_router_to_resolve(self):
        assert "visibility" not in creation_defaults({}, NOW)
        assert creation_defaults({"visibility": "public"}, NOW)["visibility"] == (
            "public"
        )

    def test_creatable_fields_are_all_columns_on_the_session(self):
        from models.workouts import WorkoutSession

        columns = set(WorkoutSession.__table__.columns.keys())
        assert set(CREATABLE_FIELDS) <= columns

    def test_defaults_to_the_current_time_when_no_clock_is_given(self):
        before = datetime.now(timezone.utc)
        start = creation_defaults({})["start_time"]
        assert before <= start <= datetime.now(timezone.utc)
