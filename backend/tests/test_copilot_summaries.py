"""Context shaping. Pure dict in, pure dict out, no database"""

from core.copilot import summaries


def _log(**overrides):
    log = {}
    for key in summaries.NUTRIENT_KEYS:
        log[f"total_{key}"] = 0
        log[f"target_{key}"] = 0
    log.update(overrides)
    return log


class TestRemainingNutrients:
    def test_subtracts_consumed_from_target(self):
        log = _log(target_calories=2500, total_calories=1800)
        assert summaries.remaining_nutrients(log)["calories"] == 700

    def test_keeps_the_sign_when_over_target(self):
        # A clamped zero would read as "nothing left but nothing wrong", and the
        # model would go on suggesting food on a day already 300 over
        log = _log(target_calories=2000, total_calories=2300)
        assert summaries.remaining_nutrients(log)["calories"] == -300

    def test_covers_every_tracked_nutrient(self):
        remaining = summaries.remaining_nutrients(_log())
        assert set(remaining) == set(summaries.NUTRIENT_KEYS)

    def test_missing_keys_are_treated_as_zero(self):
        assert summaries.remaining_nutrients({})["protein_g"] == 0

    def test_non_numeric_values_do_not_raise(self):
        log = _log(total_protein_g="not a number", target_protein_g=180)
        assert summaries.remaining_nutrients(log)["protein_g"] == 180


class TestMealsByType:
    def test_groups_by_meal_type(self):
        meals = [
            {"name": "Oats", "meal_type": "breakfast", "calories": 300},
            {"name": "Rice", "meal_type": "lunch", "calories": 400},
            {"name": "Eggs", "meal_type": "breakfast", "calories": 150},
        ]
        grouped = summaries.meals_by_type(meals)
        assert len(grouped["breakfast"]) == 2
        assert len(grouped["lunch"]) == 1

    def test_falls_back_to_other_when_type_missing(self):
        assert "other" in summaries.meals_by_type([{"name": "Snack"}])

    def test_accepts_the_food_name_alias(self):
        grouped = summaries.meals_by_type([{"food_name": "Whey", "meal_type": "snack"}])
        assert grouped["snack"][0]["name"] == "Whey"

    def test_caps_the_number_of_meals(self):
        meals = [{"name": f"M{i}", "meal_type": "snack"} for i in range(60)]
        grouped = summaries.meals_by_type(meals)
        assert len(grouped["snack"]) == summaries.MAX_RECENT_MEALS


class TestTopSet:
    def test_picks_the_heaviest_completed_set(self):
        sets = [
            {"weight_kg": 60, "reps": 10, "completed": True},
            {"weight_kg": 80, "reps": 5, "completed": True},
            {"weight_kg": 70, "reps": 8, "completed": True},
        ]
        assert summaries.top_set(sets)["weight_kg"] == 80

    def test_ignores_planned_sets(self):
        # A planned 100kg set is an intention, not a lift, and letting it win
        # would have the copilot programme off weights never actually moved
        sets = [
            {"weight_kg": 100, "reps": 5, "completed": False},
            {"weight_kg": 60, "reps": 10, "completed": True},
        ]
        assert summaries.top_set(sets)["weight_kg"] == 60

    def test_returns_none_when_nothing_was_completed(self):
        assert summaries.top_set([{"weight_kg": 60, "completed": False}]) is None

    def test_returns_none_for_an_empty_list(self):
        assert summaries.top_set([]) is None


class TestSessionSummary:
    def test_counts_completed_against_planned(self):
        session = {
            "name": "Push A",
            "duration_seconds": 3600,
            "exercises": [
                {
                    "name": "Bench",
                    "sets": [
                        {"weight_kg": 60, "completed": True},
                        {"weight_kg": 60, "completed": False},
                    ],
                }
            ],
        }
        result = summaries.session_summary(session)
        assert result["duration_minutes"] == 60.0
        assert result["exercises"][0]["sets_completed"] == 1
        assert result["exercises"][0]["sets_planned"] == 2

    def test_handles_a_session_with_no_exercises(self):
        assert summaries.session_summary({"name": "Empty"})["exercises"] == []

    def test_caps_the_session_list(self):
        sessions = [{"name": f"S{i}"} for i in range(30)]
        assert len(summaries.recent_sessions(sessions)) == summaries.MAX_RECENT_SESSIONS


class TestMuscleVolume:
    def test_totals_completed_sets_per_muscle(self):
        sessions = [
            {
                "exercises": [
                    {"name": "Bench", "sets": [{"completed": True}, {"completed": True}]},
                    {"name": "Row", "sets": [{"completed": True}]},
                ]
            },
            {"exercises": [{"name": "Bench", "sets": [{"completed": True}]}]},
        ]
        counts = summaries.muscle_volume(sessions, {"Bench": "Chest", "Row": "Lats"})
        assert counts == {"Chest": 3, "Lats": 1}

    def test_skips_exercises_missing_from_the_library(self):
        sessions = [{"exercises": [{"name": "Mystery", "sets": [{"completed": True}]}]}]
        assert summaries.muscle_volume(sessions, {}) == {}

    def test_a_muscle_with_no_completed_sets_is_absent(self):
        sessions = [{"exercises": [{"name": "Bench", "sets": [{"completed": False}]}]}]
        assert summaries.muscle_volume(sessions, {"Bench": "Chest"}) == {}


class TestLiveWorkoutSummary:
    def test_returns_none_without_a_session(self):
        assert summaries.live_workout_summary(None) is None

    def test_summarises_the_open_session(self):
        live = {
            "name": "Pull B",
            "elapsed_seconds": 1800,
            "exercises": [
                {"name": "Pullup", "type": "strength", "sets": [{"completed": True}]}
            ],
        }
        result = summaries.live_workout_summary(live)
        assert result["elapsed_minutes"] == 30.0
        assert result["exercises"][0]["sets_completed"] == 1


class TestPhotoTimeline:
    def test_drops_entries_with_no_photo(self):
        logs = [
            {"date": "2026-08-01", "weight_kg": 80, "photo_url": None},
            {"date": "2026-07-01", "weight_kg": 82, "photo_url": "https://x/a.jpg"},
        ]
        timeline = summaries.photo_timeline(logs)
        assert len(timeline) == 1
        assert timeline[0]["weight_kg"] == 82

    def test_caps_the_number_of_photos(self):
        logs = [
            {"date": "2026-08-01", "weight_kg": 80, "photo_url": f"https://x/{i}.jpg"}
            for i in range(10)
        ]
        assert len(summaries.photo_timeline(logs)) == summaries.MAX_PHOTOS


class TestProfileSummary:
    def test_empty_profile_yields_an_empty_dict(self):
        assert summaries.profile_summary(None) == {}

    def test_passes_through_only_the_listed_fields(self):
        result = summaries.profile_summary(
            {"gender": "male", "age": 26, "email": "leak@example.com"}
        )
        assert result["age"] == 26
        assert "email" not in result
