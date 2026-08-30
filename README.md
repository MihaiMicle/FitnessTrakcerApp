# Fitness Tracker

A full-stack training and nutrition tracker I built because the apps I was using kept getting one half right and the other half wrong. The food loggers had no idea what a superset was. The workout loggers thought "protein" was one number. And every single one of them stopped working the moment my phone lost signal in the basement gym.

So this one does all three: precise nutrition down to the micronutrient, real workout logging with set types and rest timers, and a write queue that keeps working offline and syncs when you come back up.

**Live:** [app](https://fitness-trakcer-app-tau.vercel.app) · [API docs](https://fitnesstrakcerapp.onrender.com/docs)

> Heads up: the API runs on Render's free tier, so the first request after a quiet period takes ~30s to wake the server.

---

## What it does

### Nutrition

- **Macro targets that calculate themselves.** Mifflin-St Jeor for BMR, scaled by activity level and goal (cut, bulk, maintain). You can override any number afterwards.
- **Sub-macros scale with your targets.** Sugar caps at 10% of carbs, saturated fat at 25% of fats, sodium and potassium track training intensity. No manually retyping fifteen fields every time your weight changes.
- **15 tracked nutrients**, not four: protein, carbs, fats, saturated fat, fiber, sugar, potassium, sodium, iron, vitamin D, zinc, magnesium, calcium, cholesterol, water.
- **Barcode scanning** for packaged food, a personal food library, saved meals and recipe bundles you can log in one tap.
- **Date navigation** so you can backfill yesterday or pre-log meal prep for the week.

### Workouts

- **Routine editor** with an exercise library, custom exercises, muscle tagging and equipment.
- **Live workout mode** — set-by-set logging, set types (warmup, working, drop, failure), supersets, and per-set weight/reps/RIR.
- **Rest timers** configurable three levels deep: per exercise, per set type, per individual set. The most specific setting wins. Timers are deadline-based rather than counters, so backgrounding the tab doesn't drift them, and four separate notification channels make sure you actually hear it.
- **Body map analytics** — muscle distribution and muscle group ranking rendered on an anatomical figure, front and back, male and female.
- **Last performance** surfaced inline while you're logging, so you know what to beat.

### Offline-first logging

Gym wifi is bad and losing a set you just did is the worst possible failure in a fitness app. So writes never go straight to the network:

- Every session gets a **client-generated UUID**, which turns saves into idempotent `PUT` upserts. A retry can't create a duplicate.
- Writes land in a **persistent queue** in localStorage, get coalesced, and retry with exponential backoff.
- Anything that fails permanently is **dead-lettered** rather than dropped silently.
- In-progress workouts survive a tab eviction or a browser crash.
- A `SyncStatusBadge` tells you honestly whether your data is saved or still pending.

### Social

Follow graph with public and private accounts, follow requests, blocking, user search, and per-item visibility on workouts, routines and weight logs. Routines can be published and copied by other users.

### Other bits

- **AI copilot** (Gemini) with context on your logged data.
- **Progress gallery** — full-screen photo viewer with a compare mode, filmstrip, keyboard nav and canvas-rendered before/after export.
- **Onboarding wizard**, metric/imperial toggle, drag-and-drop dashboard widgets, water tracker, weight charts.

---

## Stack

**Frontend** — Next.js 16 (App Router), React 19, TypeScript, Tailwind v4, Recharts, Vitest
**Backend** — FastAPI, SQLAlchemy 2, Pydantic v2, pytest
**Data** — Supabase (Postgres, Auth, Storage)
**Deploy** — Vercel (frontend), Render (API)

Auth is Supabase JWT. The frontend gets a session from Supabase and sends the access token as a bearer; the backend verifies it against `SUPABASE_JWT_SECRET` and never trusts a user id from the request body.

---

## Running it locally

You'll need Node 22, Python 3.12 and a Supabase project.

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate          # Windows: .\venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

`backend/.env`:

```env
DATABASE_URL=postgresql://...     # Supabase connection string
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_KEY=...                  # anon key
SUPABASE_SERVICE_ROLE_KEY=...     # server-side only, never ships to the client
SUPABASE_JWT_SECRET=...
GEMINI_API_KEY=...                # optional, only needed for the copilot
```

API comes up on `http://127.0.0.1:8000`, interactive docs at `/docs`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

`frontend/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

### Database

`Base.metadata.create_all` runs on startup and will create any missing tables, so a fresh Supabase project bootstraps itself. It does **not** add columns to tables that already exist — schema changes to existing tables need SQL run by hand in the Supabase editor.

---

## Tests

466 tests, no database and no network, about two seconds end to end.

```bash
# Backend — 93 tests over the calc engine, rest rules, sync and social permissions
cd backend
pip install -r requirements.txt -r requirements-dev.txt
pytest

# Frontend — 373 tests over lib/nutrition, lib/workouts, lib/offline, lib/social
cd frontend
npm test
npm run test:coverage             # enforces the thresholds in vitest.config.ts
```

Both suites run on every push and PR via GitHub Actions.

The coverage gate only counts the pure logic in `lib/`. Components are deliberately excluded — including them would report a flattering-looking number that hides whether the arithmetic is actually covered, and the arithmetic is the part where a wrong answer looks like a plausible one. See [TESTING.md](TESTING.md).

---

## Layout

```
backend/
  main.py               # app wiring and CORS
  core/                 # pure logic, imports nothing heavy
    calculations.py     #   BMR, TDEE, macro scaling
    rest.py             #   rest-time resolution, mirrors the TS rules
    sync.py             #   session upsert
    social.py           #   visibility and permission rules
    security.py         #   JWT verification
  models/               # SQLAlchemy
  schemas/              # Pydantic
  routers/              # HTTP layer, thin on purpose
  seeds/                # default exercises and ~19 food categories
  tests/

frontend/
  app/                  # App Router pages
  components/           # UI, grouped by feature
  lib/
    nutrition/          # macro math, serving conversion
    workouts/           # sets, rest, records, body map, strength standards
    offline/            # queue, sync, drafts, storage, id generation
    social/             # visibility helpers
    context/            # workout session state
  types/
```

The rule that keeps this maintainable: **anything worth testing lives in `lib/` or `core/` and imports nothing**. Routers and components are glue.

---

## Roadmap

Tracked on a Notion board. Roughly in dependency order:

- [x] Test harness, seed data
- [x] Routine CRUD
- [x] Normalized `workout_sets` table
- [x] Set types, supersets, rest timers
- [x] Offline logging, calendar dashboard
- [x] Muscle distribution and ranking
- [x] Social data model, follow graph, visibility
- [x] 1RM calculator and per-exercise statistics
- [x] Worldwide strength classification
- [ ] Cardio logging and analysis
- [ ] Health App / Google Fit import
- [ ] GDPR export and hard delete
- [ ] Activity feed

---

## Known rough edges

Being honest rather than pretending:

- `WorkoutSession.exercises` is still a JSONB blob alongside the normalized `workout_sets` table. The blob is the write path, the table is the read path for analytics. They need to converge.
- `ignoreBuildErrors` in `next.config.ts` should come out. It once hid a real breaking change in a dependency's API.
- Cardio exercises can be created but not meaningfully logged or analyzed yet.
- No service worker, so the offline queue survives a bad connection but not a full page load while offline.

---

## License

Personal project, no license yet. Feel free to read it and steal ideas.