"""
Reply parsing.

These are the tests that matter most in the copilot: the client renders buttons
that write to the database off these fields, so a half-parsed reply must never
produce a card that looks actionable and is not
"""

import json

from core.copilot import parsing


class TestStripCodeFences:
    def test_removes_a_json_fence(self):
        assert parsing.strip_code_fences('```json\n{"a": 1}\n```') == '{"a": 1}'

    def test_removes_a_bare_fence(self):
        assert parsing.strip_code_fences('```\n{"a": 1}\n```') == '{"a": 1}'

    def test_leaves_unfenced_text_alone(self):
        assert parsing.strip_code_fences('{"a": 1}') == '{"a": 1}'

    def test_handles_empty_input(self):
        assert parsing.strip_code_fences("") == ""


class TestExtractJsonObject:
    def test_parses_a_clean_object(self):
        assert parsing.extract_json_object('{"message": "hi"}') == {"message": "hi"}

    def test_recovers_an_object_after_a_preamble(self):
        raw = 'Sure, here you go:\n{"message": "hi"}'
        assert parsing.extract_json_object(raw) == {"message": "hi"}

    def test_returns_none_for_prose(self):
        assert parsing.extract_json_object("no json at all") is None

    def test_returns_none_for_a_json_array(self):
        # A top level array is valid JSON but not the agreed shape
        assert parsing.extract_json_object("[1, 2, 3]") is None


class TestNormalizeMeal:
    def test_keeps_a_well_formed_meal(self):
        meal = parsing.normalize_meal(
            {
                "title": "Chicken bowl",
                "meal_type": "dinner",
                "foods": [{"food_name": "Chicken", "calories": 280, "protein_g": 52}],
            }
        )
        assert meal["meal_type"] == "dinner"
        assert meal["foods"][0]["calories"] == 280

    def test_drops_a_meal_with_no_foods(self):
        # The card would render a log button that logs nothing
        assert parsing.normalize_meal({"title": "Empty", "foods": []}) is None

    def test_falls_back_to_lunch_for_an_unknown_meal_type(self):
        meal = parsing.normalize_meal(
            {"meal_type": "brunch", "foods": [{"food_name": "Eggs"}]}
        )
        assert meal["meal_type"] == "lunch"

    def test_defaults_missing_macros_to_zero(self):
        meal = parsing.normalize_meal({"foods": [{"food_name": "Water"}]})
        assert meal["foods"][0]["protein_g"] == 0.0
        assert meal["foods"][0]["serving_size"] == 100.0

    def test_rejects_a_non_dict(self):
        assert parsing.normalize_meal("chicken") is None


class TestNormalizeExercise:
    def test_keeps_a_named_exercise(self):
        result = parsing.normalize_exercise(
            {"name": "Cable Fly", "sets": [{"weight_kg": 15, "reps": 12}]}
        )
        assert result["name"] == "Cable Fly"
        assert result["sets"][0]["reps"] == 12

    def test_drops_an_unnamed_exercise(self):
        assert parsing.normalize_exercise({"sets": [{"reps": 10}]}) is None

    def test_gives_an_empty_set_list_one_blank_set(self):
        # An exercise with no sets cannot be logged against
        result = parsing.normalize_exercise({"name": "Plank"})
        assert len(result["sets"]) == 1

    def test_caps_runaway_set_counts(self):
        result = parsing.normalize_exercise(
            {"name": "Squat", "sets": [{"reps": 5}] * 40}
        )
        assert len(result["sets"]) == 12

    def test_unknown_type_becomes_strength(self):
        assert parsing.normalize_exercise({"name": "X", "type": "yoga"})["type"] == "strength"

    def test_cardio_type_is_preserved(self):
        assert parsing.normalize_exercise({"name": "Run", "type": "cardio"})["type"] == "cardio"


class TestNormalizeRoutine:
    def test_keeps_a_routine_with_exercises(self):
        routine = parsing.normalize_routine(
            {"name": "Upper A", "exercises": [{"name": "Bench"}]}
        )
        assert routine["name"] == "Upper A"
        assert len(routine["exercises"]) == 1

    def test_drops_an_empty_routine(self):
        assert parsing.normalize_routine({"name": "Upper A", "exercises": []}) is None

    def test_rejects_a_non_dict(self):
        assert parsing.normalize_routine(None) is None


class TestNormalizeRecipe:
    def _recipe(self, **overrides):
        recipe = {
            "name": "Burrito bowls",
            "servings": 4,
            "ingredients": [
                {"food_name": "Chicken breast", "serving_size": 700, "calories": 1155}
            ],
            "steps": ["Dice the chicken", "Cook it"],
        }
        recipe.update(overrides)
        return recipe

    def test_keeps_a_well_formed_recipe(self):
        recipe = parsing.normalize_recipe(self._recipe())
        assert recipe["servings"] == 4
        assert recipe["ingredients"][0]["calories"] == 1155
        assert recipe["steps"] == ["Dice the chicken", "Cook it"]

    def test_drops_a_recipe_with_no_ingredients(self):
        # The save button would write an empty recipe
        assert parsing.normalize_recipe(self._recipe(ingredients=[])) is None

    def test_drops_a_non_dict(self):
        assert parsing.normalize_recipe("a recipe") is None

    def test_missing_servings_defaults_to_one(self):
        recipe = self._recipe()
        del recipe["servings"]
        assert parsing.normalize_recipe(recipe)["servings"] == 1

    def test_zero_or_negative_servings_become_one(self):
        # The client divides by servings
        assert parsing.normalize_recipe(self._recipe(servings=0))["servings"] == 1
        assert parsing.normalize_recipe(self._recipe(servings=-3))["servings"] == 1

    def test_servings_are_rounded_and_capped(self):
        assert parsing.normalize_recipe(self._recipe(servings="2.6"))["servings"] == 3
        assert (
            parsing.normalize_recipe(self._recipe(servings=500))["servings"]
            == parsing.MAX_RECIPE_SERVINGS
        )

    def test_steps_given_as_a_string_are_dropped(self):
        # Iterating a string would turn it into one step per character
        recipe = parsing.normalize_recipe(self._recipe(steps="Cook everything"))
        assert recipe["steps"] == []

    def test_blank_steps_are_removed_and_the_list_is_capped(self):
        steps = ["", "  ", *[f"Step {n}" for n in range(30)]]
        recipe = parsing.normalize_recipe(self._recipe(steps=steps))
        assert recipe["steps"][0] == "Step 0"
        assert len(recipe["steps"]) == parsing.MAX_RECIPE_STEPS

    def test_a_missing_name_gets_a_placeholder(self):
        assert parsing.normalize_recipe(self._recipe(name=None))["name"] == "New recipe"


class TestNormalizeBodyFat:
    def test_keeps_a_plausible_estimate(self):
        result = parsing.normalize_body_fat(
            {"estimate_percent": 14.5, "range_low": 13, "range_high": 16,
             "confidence": "medium"}
        )
        assert result["estimate_percent"] == 14.5
        assert result["confidence"] == "medium"

    def test_rejects_an_implausible_percentage(self):
        # 0.145 is the model returning a fraction, not a percent
        assert parsing.normalize_body_fat({"estimate_percent": 0.145}) is None
        assert parsing.normalize_body_fat({"estimate_percent": 95}) is None

    def test_requires_a_point_estimate(self):
        assert parsing.normalize_body_fat({"range_low": 13, "range_high": 16}) is None

    def test_unknown_confidence_becomes_low(self):
        result = parsing.normalize_body_fat(
            {"estimate_percent": 20, "confidence": "certain"}
        )
        assert result["confidence"] == "low"

    def test_range_is_optional(self):
        result = parsing.normalize_body_fat({"estimate_percent": 20})
        assert result["range_low"] is None


class TestNormalizeAction:
    def test_keeps_a_known_action(self):
        action = parsing.normalize_action(
            {"type": "UPDATE_GOALS", "payload": {"target_calories": 2800}}
        )
        assert action["type"] == "UPDATE_GOALS"

    def test_drops_an_unknown_action_type(self):
        assert parsing.normalize_action({"type": "DELETE_ACCOUNT", "payload": {"x": 1}}) is None

    def test_drops_an_action_with_an_empty_payload(self):
        assert parsing.normalize_action({"type": "UPDATE_GOALS", "payload": {}}) is None

    def test_rejects_a_non_dict(self):
        assert parsing.normalize_action("UPDATE_GOALS") is None


class TestNormalizeReply:
    def test_parses_a_full_reply(self):
        raw = json.dumps(
            {
                "message": "Here you go",
                "action": None,
                "suggested_meals": [
                    {"title": "Bowl", "meal_type": "lunch",
                     "foods": [{"food_name": "Rice", "calories": 200}]}
                ],
                "suggested_routine": None,
                "suggested_exercises": None,
                "body_fat": None,
            }
        )
        reply = parsing.normalize_reply(raw)
        assert reply["message"] == "Here you go"
        assert len(reply["suggested_meals"]) == 1

    def test_prose_becomes_the_message(self):
        # A model that ignores the JSON instruction should still reach the user
        reply = parsing.normalize_reply("Eat more protein.")
        assert reply["message"] == "Eat more protein."
        assert reply["suggested_meals"] is None

    def test_empty_lists_normalise_to_none(self):
        raw = json.dumps({"message": "ok", "suggested_meals": []})
        assert parsing.normalize_reply(raw)["suggested_meals"] is None

    def test_carries_a_recipe_through(self):
        raw = json.dumps(
            {
                "message": "Here you go",
                "suggested_recipe": {
                    "name": "Oats",
                    "servings": 2,
                    "ingredients": [{"food_name": "Oats", "calories": 380}],
                },
            }
        )
        assert parsing.normalize_reply(raw)["suggested_recipe"]["name"] == "Oats"

    def test_a_missing_message_gets_a_placeholder(self):
        assert parsing.normalize_reply('{"action": null}')["message"] == "No response."

    def test_every_key_is_always_present(self):
        reply = parsing.normalize_reply("anything")
        assert set(reply) == {
            "message",
            "action",
            "suggested_meals",
            "suggested_routine",
            "suggested_recipe",
            "suggested_exercises",
            "body_fat",
        }

    def test_empty_reply_helper_has_the_same_shape(self):
        assert set(parsing.empty_reply("x")) == set(parsing.normalize_reply("y"))
