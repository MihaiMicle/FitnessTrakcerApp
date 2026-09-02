"""
Tests for core/feed.py

The module has no database imports, so every rule that decides what reaches a
follower's feed can be exercised directly. Two areas carry the real risk:
`dedupe_key`, which is the only thing stopping the offline queue from posting
the same workout repeatedly, and `detect_records`, which decides what the app
tells a user they achieved
"""

from datetime import datetime, timedelta, timezone

import pytest

from core import feed


def _set(**overrides):
    entry = {"set": 1, "set_type": "working", "completed": True}
    entry.update(overrides)
    return entry


def _exercise(name, sets):
    return {"id": name, "name": name, "sets": sets}


class TestEpley1RM:
    def test_a_single_is_its_own_one_rep_max(self):
        assert feed.epley_1rm(100, 1) == pytest.approx(103.33, abs=0.01)

    def test_more_reps_at_the_same_weight_estimate_higher(self):
        assert feed.epley_1rm(100, 10) > feed.epley_1rm(100, 5)

    @pytest.mark.parametrize(
        "weight,reps", [(0, 5), (100, 0), (-50, 5), (100, -1), (0, 0)]
    )
    def test_missing_or_negative_inputs_are_zero(self, weight, reps):
        assert feed.epley_1rm(weight, reps) == 0.0


class TestNormalizeEventType:
    def test_a_known_type_passes_through(self):
        assert feed.normalize_event_type("personal_record") == "personal_record"

    @pytest.mark.parametrize("value", [None, "", "nonsense", 7, {"a": 1}])
    def test_anything_else_falls_back(self, value):
        assert feed.normalize_event_type(value) == feed.EVENT_WORKOUT

    def test_the_fallback_is_overridable(self):
        assert feed.normalize_event_type(None, "routine_shared") == "routine_shared"


class TestDedupeKey:
    def test_the_same_subject_always_produces_the_same_key(self):
        """This is the property that makes a replayed offline save harmless"""
        first = feed.dedupe_key(feed.EVENT_WORKOUT, "abc")
        second = feed.dedupe_key(feed.EVENT_WORKOUT, "abc")
        assert first == second

    def test_different_subjects_do_not_collide(self):
        assert feed.dedupe_key(feed.EVENT_WORKOUT, "abc") != feed.dedupe_key(
            feed.EVENT_WORKOUT, "abd"
        )

    def test_the_detail_separates_records_within_one_session(self):
        squat = feed.dedupe_key(feed.EVENT_PERSONAL_RECORD, "abc", "Squat")
        bench = feed.dedupe_key(feed.EVENT_PERSONAL_RECORD, "abc", "Bench Press")
        assert squat != bench

    def test_a_uuid_and_its_string_agree(self):
        from uuid import UUID

        raw = "3c8f061a-e545-81db-aa5a-dbe9e94eb275"
        assert feed.dedupe_key(feed.EVENT_WORKOUT, UUID(raw)) == feed.dedupe_key(
            feed.EVENT_WORKOUT, raw
        )

    def test_an_unknown_event_type_is_normalized_into_the_key(self):
        assert feed.dedupe_key("nonsense", "abc").startswith(feed.EVENT_WORKOUT)


class TestCompletedSets:
    def test_only_ticked_sets_are_returned(self):
        exercises = [
            _exercise(
                "Squat",
                [
                    _set(weight_kg=100, reps=5),
                    _set(weight_kg=110, reps=5, completed=False),
                ],
            )
        ]
        rows = feed.completed_sets(exercises)
        assert len(rows) == 1
        assert rows[0]["weight_kg"] == 100

    @pytest.mark.parametrize("flag", [True, 1, "1", "true", "True"])
    def test_truthy_completion_markers_are_accepted(self, flag):
        exercises = [_exercise("Squat", [_set(weight_kg=100, reps=5, completed=flag)])]
        assert len(feed.completed_sets(exercises)) == 1

    @pytest.mark.parametrize("flag", [False, 0, "", None, "no"])
    def test_other_markers_are_rejected(self, flag):
        exercises = [_exercise("Squat", [_set(weight_kg=100, reps=5, completed=flag)])]
        assert feed.completed_sets(exercises) == []

    @pytest.mark.parametrize("value", [None, [], "not a list"])
    def test_a_missing_or_odd_exercise_list_is_empty(self, value):
        assert feed.completed_sets(value) == []

    def test_junk_entries_are_skipped_rather_than_raising(self):
        exercises = ["not a dict", {"name": "Squat", "sets": ["also not a dict"]}]
        assert feed.completed_sets(exercises) == []

    def test_unparseable_numbers_become_zero(self):
        exercises = [_exercise("Squat", [_set(weight_kg="heavy", reps=None)])]
        assert feed.completed_sets(exercises)[0]["weight_kg"] == 0.0


class TestWorkoutTotals:
    def test_volume_multiplies_weight_by_reps_across_every_set(self):
        exercises = [
            _exercise("Squat", [_set(weight_kg=100, reps=5), _set(weight_kg=100, reps=5)])
        ]
        assert feed.workout_totals(exercises)["total_volume_kg"] == 1000.0

    def test_warmups_count_toward_volume(self):
        """A warmup is real work, even though it cannot claim a record"""
        exercises = [
            _exercise("Squat", [_set(weight_kg=60, reps=10, set_type="warmup")])
        ]
        assert feed.workout_totals(exercises)["total_volume_kg"] == 600.0

    def test_an_exercise_appearing_twice_is_counted_once(self):
        exercises = [
            _exercise("Squat", [_set(weight_kg=100, reps=5)]),
            _exercise("Squat", [_set(weight_kg=100, reps=5)]),
        ]
        assert feed.workout_totals(exercises)["exercise_count"] == 1

    def test_incomplete_sets_are_left_out_of_every_total(self):
        exercises = [
            _exercise("Squat", [_set(weight_kg=100, reps=5, completed=False)])
        ]
        totals = feed.workout_totals(exercises)
        assert totals["set_count"] == 0
        assert totals["total_volume_kg"] == 0.0

    def test_cardio_distance_is_summed(self):
        exercises = [
            _exercise("Run", [_set(distance_km=5.25), _set(distance_km=2.5)])
        ]
        assert feed.workout_totals(exercises)["total_distance_km"] == 7.75

    def test_an_empty_workout_produces_zeroes(self):
        totals = feed.workout_totals([])
        assert totals["set_count"] == 0
        assert totals["exercise_count"] == 0


class TestBestEfforts:
    def test_the_strongest_set_wins_on_estimated_one_rep_max(self):
        rows = [
            {"exercise": "Squat", "weight_kg": 100, "reps": 5},
            {"exercise": "Squat", "weight_kg": 120, "reps": 1},
        ]
        assert feed.best_efforts(rows)["Squat"]["weight_kg"] == 120

    def test_a_lighter_set_for_many_reps_can_beat_a_heavy_single(self):
        rows = [
            {"exercise": "Squat", "weight_kg": 120, "reps": 1},
            {"exercise": "Squat", "weight_kg": 100, "reps": 10},
        ]
        assert feed.best_efforts(rows)["Squat"]["reps"] == 10

    def test_warmups_cannot_set_a_best(self):
        rows = [
            {"exercise": "Squat", "weight_kg": 200, "reps": 5, "set_type": "warmup"},
            {"exercise": "Squat", "weight_kg": 100, "reps": 5},
        ]
        assert feed.best_efforts(rows)["Squat"]["weight_kg"] == 100

    def test_a_set_with_no_weight_or_reps_is_ignored(self):
        rows = [{"exercise": "Run", "distance_km": 5}]
        assert feed.best_efforts(rows) == {}

    def test_an_unnamed_exercise_is_ignored(self):
        rows = [{"exercise": "   ", "weight_kg": 100, "reps": 5}]
        assert feed.best_efforts(rows) == {}


class TestDetectRecords:
    def test_beating_a_previous_best_is_a_record(self):
        current = feed.best_efforts([{"exercise": "Squat", "weight_kg": 110, "reps": 5}])
        previous = feed.best_efforts(
            [{"exercise": "Squat", "weight_kg": 100, "reps": 5}]
        )
        records = feed.detect_records(current, previous)
        assert len(records) == 1
        assert records[0]["exercise"] == "Squat"
        assert records[0]["improvement_kg"] > 0

    def test_a_first_ever_session_claims_nothing(self):
        """Otherwise every movement in a new user's first workout is a PR"""
        current = feed.best_efforts([{"exercise": "Squat", "weight_kg": 100, "reps": 5}])
        assert feed.detect_records(current, {}) == []

    def test_matching_a_previous_best_is_not_a_record(self):
        current = feed.best_efforts([{"exercise": "Squat", "weight_kg": 100, "reps": 5}])
        previous = feed.best_efforts(
            [{"exercise": "Squat", "weight_kg": 100, "reps": 5}]
        )
        assert feed.detect_records(current, previous) == []

    def test_floating_point_noise_does_not_claim_a_record(self):
        current = {"Squat": {"exercise": "Squat", "weight_kg": 100, "reps": 5, "one_rm": 116.65001}}
        previous = {"Squat": {"one_rm": 116.65}}
        assert feed.detect_records(current, previous) == []

    def test_records_are_capped_and_ordered_by_improvement(self):
        current = {
            name: {"exercise": name, "weight_kg": 100, "reps": 5, "one_rm": gain}
            for name, gain in [("A", 200.0), ("B", 150.0), ("C", 130.0), ("D", 120.0)]
        }
        previous = {name: {"one_rm": 100.0} for name in current}

        records = feed.detect_records(current, previous)
        assert len(records) == feed.MAX_RECORDS_PER_SESSION
        assert [record["exercise"] for record in records] == ["A", "B", "C"]

    def test_a_limit_of_zero_returns_nothing(self):
        current = {"A": {"exercise": "A", "weight_kg": 1, "reps": 1, "one_rm": 200.0}}
        assert feed.detect_records(current, {"A": {"one_rm": 100.0}}, limit=0) == []

    def test_a_previous_best_of_zero_is_treated_as_no_history(self):
        current = {"A": {"exercise": "A", "weight_kg": 1, "reps": 1, "one_rm": 50.0}}
        assert feed.detect_records(current, {"A": {"one_rm": 0}}) == []


class TestTitles:
    def test_a_named_workout_keeps_its_name(self):
        assert feed.build_workout_title("  Push Day  ") == "Push Day"

    @pytest.mark.parametrize("value", [None, "", "   "])
    def test_an_unnamed_workout_gets_a_default(self, value):
        assert feed.build_workout_title(value) == "Workout"

    def test_a_record_title_names_the_exercise(self):
        assert feed.build_record_title({"exercise": "Deadlift"}) == "New PR: Deadlift"

    def test_a_record_with_no_exercise_still_reads(self):
        assert feed.build_record_title({}) == "New PR: Exercise"

    def test_a_routine_title_names_the_routine(self):
        assert feed.build_routine_title("Upper A") == "Shared a routine: Upper A"

    def test_an_unnamed_routine_falls_back(self):
        assert feed.build_routine_title(None) == "Shared a routine"


class TestNormalizeComment:
    def test_surrounding_whitespace_is_trimmed(self):
        assert feed.normalize_comment("  strong work  ") == "strong work"

    @pytest.mark.parametrize("value", [None, "", "   ", "\n\t"])
    def test_an_empty_comment_is_rejected(self, value):
        with pytest.raises(feed.FeedError):
            feed.normalize_comment(value)

    def test_a_comment_at_the_limit_is_accepted(self):
        body = "x" * feed.COMMENT_MAX_LENGTH
        assert feed.normalize_comment(body) == body

    def test_a_comment_over_the_limit_is_rejected(self):
        with pytest.raises(feed.FeedError):
            feed.normalize_comment("x" * (feed.COMMENT_MAX_LENGTH + 1))


class TestClampPageSize:
    @pytest.mark.parametrize("value", [None, 0, -5])
    def test_a_missing_or_invalid_limit_uses_the_default(self, value):
        assert feed.clamp_page_size(value) == feed.FEED_PAGE_SIZE

    def test_an_oversized_limit_is_capped(self):
        assert feed.clamp_page_size(5000) == feed.FEED_MAX_PAGE_SIZE

    def test_a_reasonable_limit_passes_through(self):
        assert feed.clamp_page_size(7) == 7


class TestCursors:
    def test_a_cursor_round_trips(self):
        moment = datetime(2026, 8, 26, 12, 30, tzinfo=timezone.utc)
        token = feed.encode_cursor(moment, "abc")
        assert feed.decode_cursor(token) == (moment, "abc")

    def test_a_naive_timestamp_is_read_as_utc(self):
        token = feed.encode_cursor(datetime(2026, 8, 26, 12, 30), "abc")
        decoded = feed.decode_cursor(token)
        assert decoded[0] == datetime(2026, 8, 26, 12, 30, tzinfo=timezone.utc)

    def test_a_non_utc_timestamp_is_normalized(self):
        eastern = timezone(timedelta(hours=-5))
        moment = datetime(2026, 8, 26, 7, 30, tzinfo=eastern)
        decoded = feed.decode_cursor(feed.encode_cursor(moment, "abc"))
        assert decoded[0] == moment

    @pytest.mark.parametrize("moment,event_id", [(None, "abc"), (datetime.now(), None)])
    def test_an_incomplete_position_produces_no_cursor(self, moment, event_id):
        assert feed.encode_cursor(moment, event_id) is None

    @pytest.mark.parametrize(
        "token",
        [None, "", "!!!not base64!!!", "Zm9vYmFy", "MjAyNi0wMS0wMXw="],
    )
    def test_a_malformed_cursor_decodes_to_none(self, token):
        """A stale token from an old client should serve page one, not a 500"""
        assert feed.decode_cursor(token) is None

    def test_an_unparseable_timestamp_decodes_to_none(self):
        import base64

        raw = base64.urlsafe_b64encode(b"not-a-date|abc").decode("ascii")
        assert feed.decode_cursor(raw) is None
