# Testing

Covers roadmap task **3 — Test harness** (phase 0). Two suites, both scoped to
calculation logic: the code where a wrong answer renders as a plausible number
instead of throwing.

- **Backend** — pytest, 60 tests over the TDEE / macro engine.
- **Frontend** — Vitest, 144 tests over `lib/nutrition` and `lib/workouts`.

## Running

```bash
# Backend
cd backend
pip install -r requirements.txt -r requirements-dev.txt
pytest                      # runs with coverage; report in backend/htmlcov
pytest -k katch             # single topic
pytest tests/test_calculations.py::test_mifflin_st_jeor_male

# Frontend
cd frontend
npm install
npm test                    # one-shot
npm run test:watch          # re-runs on save
npm run test:coverage       # enforces thresholds; report in frontend/coverage
```

Neither suite touches a database or the network. The whole thing runs in about
two seconds.

## Layout

```
backend/
  core/calculations.py            # pure math, extracted from routers/profile.py
  pytest.ini
  requirements-dev.txt
  tests/
    conftest.py                   # import-time env stubs
    test_calculations.py

frontend/
  vitest.config.ts
  lib/nutrition/__tests__/{macros,servings,mealForm}.test.ts
  lib/workouts/__tests__/constants.test.ts

.github/workflows/tests.yml       # both suites on push and PR
```

## The one structural change

`calculate_macros` was defined in `routers/profile.py`. That module imports
FastAPI, SQLAlchemy and Supabase, and `core/database.py` raises at import time
when `DATABASE_URL` is unset — so the function could not be imported without a
database, and therefore could not be unit tested.

It moved verbatim to `backend/core/calculations.py`, which imports nothing.
`routers/profile.py` now does:

```python
from core.calculations import calculate_macros
```

The function body is unchanged. Behaviour was diffed against the original across
six representative cases plus a 25,200-case grid before and after the move.

**Phase 4 and 5 math belongs in this module too** — Epley 1RM, per-exercise
statistics, muscle distribution, muscle group ranking, worldwide percentile.
All of it is a pure function of a set list. Put it in `core/calculations.py` and
it is testable the day it is written, with no fixtures and no database.

## Conventions

**Characterisation, not aspiration.** Tests lock in what the code does *today*
so refactoring can't silently move someone's calorie target. Where current
behaviour looks wrong, the test says so in a comment rather than quietly
asserting it's correct.

**Expected values are derived, not captured.** Every number in the backend tests
is computed by hand from the documented formula and shown in a comment:

```python
def test_mifflin_st_jeor_male():
    # BMR = 10(80) + 6.25(180) - 5(30) + 5 = 800 + 1125 - 150 + 5 = 1780
    # TDEE = 1780 * 1.55 = 2759
    assert macros()["calories"] == 2759
```

Pasting in whatever the function returned would make the test pass and prove
nothing.

**Known defects get a strict xfail.** They pass as "expected failure" today and
turn into a *reported* failure the moment someone fixes the underlying bug, which
is the prompt to delete the xfail.

**One variable at a time.** Backend tests override a single field of a shared
`BASELINE` profile, so a failure names its own cause.

## Coverage

| Area | Statements | Branches |
|---|---|---|
| `lib/nutrition` | 100% | 98.6% |
| `lib/workouts` | 100% | 100% |
| `core/calculations.py` | 100% | 100% |

Frontend thresholds are enforced in `vitest.config.ts` at 90 / 85 / 90 / 90 —
below what's achieved, so ordinary changes don't turn the build red for no
reason. The coverage `include` glob deliberately lists only directories that
have tests. Widening it to cover untested code makes the gate permanently red,
which teaches people to ignore it. Add to the glob as you add tests.

**Not covered yet:** `lib/api.ts`, `lib/images.ts`, `lib/progressShare.ts`, and
everything under `components/` and `hooks/`. Component tests need
`happy-dom` plus `@testing-library/react`; add them per-file with a
`// @vitest-environment happy-dom` docblock rather than switching the global
environment, which would slow the pure-logic tests down for no benefit.

## Defects the suite found

### 1. Macro split overshoots for high-body-fat users on a cut

Protein is `2.2 g/kg` of **total** bodyweight, but Katch-McArdle derives BMR from
**lean** mass. When both apply, the protein target alone can exceed the calorie
target.

A 150 kg user at 60% body fat, sedentary, cutting:

| | |
|---|---|
| Calorie target | 1499 kcal |
| Protein | 330 g → 1320 kcal |
| Fat | 41 g → 369 kcal |
| Carbs | **0 g** (clamped from −190) |
| Macros actually total | **1689 kcal — 13% over** |

`max(remaining // 4, 0)` keeps the number non-negative, so nothing errors and the
UI renders a confident, wrong plan with zero carbohydrate.

The Mifflin path is clean: worst drift is 3 kcal across a 25,200-case grid. This
is specific to users who fill in body fat.

Fix by capping protein against the calorie target, or by basing it on lean mass
when body fat is known. Then delete the `xfail` on
`test_macro_grams_reconstruct_calories_even_at_high_body_fat`.

### 2. A 0 g custom serving returns `0`, not `null`

`getGramsMultiplier` ends with `custom ? custom.equivalent_g : null`. A custom
serving saved with `equivalent_g: 0` is truthy as an object, so the function
returns `0` rather than the `null` that callers use as "skip rescaling".
`useMealForm` then computes `requestedGrams / baseGrams` and produces `Infinity`
or `NaN` across every nutrient.

Fix by rejecting `equivalent_g <= 0` at save time, or by treating it as `null`
here. Pinned as current behaviour in `servings.test.ts`.

### 3. Unrecognised goal strings silently mean maintain

`if goal == "cut" ... elif goal == "bulk" ... else: maintain`. Nothing validates
the input, so `"Cut"` from the client gives a 500 kcal surplus over what the user
asked for, with no error. Same shape in the gender branch: anything that isn't
exactly lowercase `"male"` — including `"MALE"` — takes the −161 female constant.

### 4. Dead code

The `multipliers` dict at the top of `calculate_macros` is never read;
`activity_level` arrives as a float already. Worth deleting so nobody assumes
the string keys are a supported input.

### 5. Positional 16-tuple return

`calculate_macros` returns 16 positional values that the router unpacks across
five separate tuple assignments. Insert a field without updating the caller and
every target after that point shifts by one, silently. `MACRO_RESULT_FIELDS` and
`test_returns_sixteen_values_in_documented_order` are the guard rail;
`macros_as_dict()` is the safer accessor for new callers.

## What to test next

Roughly in roadmap order:

1. **Task 6, normalize workout sets** — write the aggregation tests against the
   new `workout_sets` table *before* the backfill migration, and run them against
   both the JSONB and normalized paths. That's how you prove the migration didn't
   drop anything.
2. **Task 16, 1RM calculator** — Epley is `w * (1 + r/30)`. Pin the `r = 1` case
   (must return `w` exactly), the `r = 0` case, and the point where the formula
   stops being credible (past ~12 reps).
3. **Tasks 18–20, aggregate analytics** — muscle distribution and percentile
   ranking are pure functions of a set list. Test the empty-history case, the
   single-workout case, and ties in the ranking.
4. **Task 11, offline logging** — the queue's replay and dedupe logic is pure and
   worth testing hard, since the failure mode is a lost or double-counted set.
