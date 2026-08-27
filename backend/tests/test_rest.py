"""
Tests for the rest resolution rules.

These mirror `frontend/lib/workouts/__tests__/rest.test.ts` on purpose. The
frontend decides how long the timer runs and the backend decides what gets
written to `workout_sets.rest_seconds`; if the two ever disagree, a user's
logged rest stops matching the rest they actually took

The default values are pinned rather than derived, so changing one without
changing the TypeScript side fails here
"""

import pytest

from core.rest import (
    DEFAULT_REST_SECONDS,
    MAX_REST_SECONDS,
    clamp_rest_seconds,
    exercise_rest_seconds,
    normalize_set_type,
    resolve_rest_seconds,
)


# Defaults
def test_drop_sets_default_to_ten_seconds():
    """Straight from the task, a drop set follows almost immediately"""
    assert DEFAULT_REST_SECONDS["D"] == 10


def test_warmups_rest_less_than_working_sets():
    assert DEFAULT_REST_SECONDS["W"] < DEFAULT_REST_SECONDS["working"]


def test_failure_sets_rest_at_least_as_long_as_working_sets():
    assert DEFAULT_REST_SECONDS["F"] >= DEFAULT_REST_SECONDS["working"]


def test_defaults_match_the_typescript_values():
    # Any change here needs the same change in lib/workouts/rest.ts
    assert DEFAULT_REST_SECONDS == {"working": 90, "W": 30, "D": 10, "F": 120}


# normalize_set_type
@pytest.mark.parametrize("set_type", ["working", "W", "D", "F"])
def test_known_set_types_pass_through(set_type):
    assert normalize_set_type(set_type) == set_type


@pytest.mark.parametrize("value", [None, "", "warmup", 3, {}])
def test_unknown_set_types_become_working(value):
    # Rows written before set types existed have no set_type at all
    assert normalize_set_type(value) == "working"


# clamp_rest_seconds
def test_clamp_rounds_to_whole_seconds():
    assert clamp_rest_seconds(90.4) == 90
    assert clamp_rest_seconds(89.6) == 90


def test_clamp_floors_at_zero_and_caps_at_an_hour():
    assert clamp_rest_seconds(-30) == 0
    assert clamp_rest_seconds(999999) == MAX_REST_SECONDS


@pytest.mark.parametrize("value", [None, "90", True, False, float("nan")])
def test_clamp_rejects_anything_that_is_not_a_number(value):
    # None means inherit, and a bool is never a rest value even though
    # Python treats it as an int
    assert clamp_rest_seconds(value) is None


# resolve_rest_seconds
def test_falls_back_to_the_default_for_the_set_type():
    assert resolve_rest_seconds({}, {"set_type": "W"}) == DEFAULT_REST_SECONDS["W"]
    assert resolve_rest_seconds({}, {"set_type": "D"}) == 10


def test_exercise_setting_beats_the_default():
    exercise = {"rest_by_type": {"working": 150}}
    assert resolve_rest_seconds(exercise, {"set_type": "working"}) == 150


def test_exercise_setting_applies_per_set_type():
    exercise = {"rest_by_type": {"working": 150}}
    assert (
        resolve_rest_seconds(exercise, {"set_type": "W"})
        == DEFAULT_REST_SECONDS["W"]
    )


def test_set_override_beats_everything():
    exercise = {"rest_by_type": {"working": 150}}
    workout_set = {"set_type": "working", "rest_seconds": 45}
    assert resolve_rest_seconds(exercise, workout_set) == 45


def test_zero_override_is_honoured():
    # Zero means take no rest, which is different from leaving it blank
    exercise = {"rest_by_type": {"working": 150}}
    workout_set = {"set_type": "working", "rest_seconds": 0}
    assert resolve_rest_seconds(exercise, workout_set) == 0


def test_null_override_falls_back_to_the_exercise():
    exercise = {"rest_by_type": {"working": 150}}
    workout_set = {"set_type": "working", "rest_seconds": None}
    assert resolve_rest_seconds(exercise, workout_set) == 150


def test_missing_exercise_or_set_still_resolves():
    assert resolve_rest_seconds(None, None) == DEFAULT_REST_SECONDS["working"]
    assert resolve_rest_seconds({}, {}) == DEFAULT_REST_SECONDS["working"]


def test_a_malformed_rest_by_type_is_ignored():
    # JSONB will hold whatever an older client wrote into it
    assert (
        resolve_rest_seconds({"rest_by_type": "90"}, {"set_type": "working"})
        == DEFAULT_REST_SECONDS["working"]
    )
    assert (
        resolve_rest_seconds({"rest_by_type": None}, {"set_type": "working"})
        == DEFAULT_REST_SECONDS["working"]
    )


def test_out_of_range_stored_values_are_clamped():
    assert resolve_rest_seconds({"rest_by_type": {"working": -5}}, {}) == 0


# exercise_rest_seconds
def test_exercise_rest_ignores_set_overrides():
    exercise = {"rest_by_type": {"W": 20}}
    assert exercise_rest_seconds(exercise, "W") == 20
    assert exercise_rest_seconds(exercise, "working") == DEFAULT_REST_SECONDS[
        "working"
    ]


def test_exercise_rest_handles_a_missing_exercise():
    assert exercise_rest_seconds(None, "D") == 10
