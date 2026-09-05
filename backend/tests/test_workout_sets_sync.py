"""
Tests for flattening a session's exercises JSONB into workout_set rows

`core/workouts.py` imports only `core/rest.py`, so none of this needs a
database. `test_rest.py` already pins the rest resolution rules this module
delegates to
"""

from core.workouts import DEFAULT_EXERCISE_NAME, build_workout_sets


class TestBuildWorkoutSets:
    def test_empty_exercises_produce_no_rows(self):
        assert build_workout_sets("session-1", "user-1", []) == []

    def test_none_exercises_produce_no_rows(self):
        assert build_workout_sets("session-1", "user-1", None) == []

    def test_one_set_becomes_one_row(self):
        exercises = [{"name": "Bench Press", "sets": [{"set": 1, "reps": 5}]}]
        rows = build_workout_sets("session-1", "user-1", exercises)

        assert len(rows) == 1
        row = rows[0]
        assert row["session_id"] == "session-1"
        assert row["user_id"] == "user-1"
        assert row["exercise_name"] == "Bench Press"
        assert row["set_number"] == 1
        assert row["reps"] == 5

    def test_every_set_across_every_exercise_becomes_a_row(self):
        exercises = [
            {"name": "Squat", "sets": [{"set": 1}, {"set": 2}]},
            {"name": "Row", "sets": [{"set": 1}]},
        ]
        rows = build_workout_sets("session-1", "user-1", exercises)

        assert len(rows) == 3
        assert [r["exercise_name"] for r in rows] == ["Squat", "Squat", "Row"]

    def test_missing_exercise_name_falls_back_to_a_placeholder(self):
        exercises = [{"sets": [{"set": 1}]}]
        rows = build_workout_sets("session-1", "user-1", exercises)
        assert rows[0]["exercise_name"] == DEFAULT_EXERCISE_NAME

    def test_missing_set_number_defaults_to_one(self):
        exercises = [{"name": "Curl", "sets": [{}]}]
        rows = build_workout_sets("session-1", "user-1", exercises)
        assert rows[0]["set_number"] == 1

    def test_missing_set_type_defaults_to_working(self):
        exercises = [{"name": "Curl", "sets": [{}]}]
        rows = build_workout_sets("session-1", "user-1", exercises)
        assert rows[0]["set_type"] == "working"

    def test_incomplete_by_default(self):
        exercises = [{"name": "Curl", "sets": [{}]}]
        rows = build_workout_sets("session-1", "user-1", exercises)
        assert rows[0]["completed"] is False

    def test_an_exercise_with_no_sets_produces_no_rows(self):
        exercises = [{"name": "Squat", "sets": []}]
        assert build_workout_sets("session-1", "user-1", exercises) == []

    def test_blank_strings_are_folded_to_none(self):
        exercises = [{"name": "Bench Press", "sets": [{"weight_kg": "", "reps": ""}]}]
        row = build_workout_sets("session-1", "user-1", exercises)[0]
        assert row["weight_kg"] is None
        assert row["reps"] is None

    def test_zero_is_not_folded_to_none(self):
        # A zero rep set is a real (if unusual) value, not a blank input
        exercises = [{"name": "Bench Press", "sets": [{"reps": 0}]}]
        row = build_workout_sets("session-1", "user-1", exercises)[0]
        assert row["reps"] == 0

    def test_rest_seconds_is_resolved_via_core_rest(self):
        exercises = [
            {
                "name": "Bench Press",
                "rest_by_type": {"working": 150},
                "sets": [{"set_type": "working"}],
            }
        ]
        row = build_workout_sets("session-1", "user-1", exercises)[0]
        assert row["rest_seconds"] == 150

    def test_every_nullable_field_is_carried_through(self):
        entry = {
            "weight_kg": 100,
            "reps": 5,
            "rir": 2,
            "duration_minutes": 10,
            "distance_km": 3,
            "incline": 1,
            "speed": 8,
            "difficulty": 7,
        }
        exercises = [{"name": "Row", "sets": [entry]}]
        row = build_workout_sets("session-1", "user-1", exercises)[0]

        for field, value in entry.items():
            assert row[field] == value
