/*
 * Rest timing rules
 *
 * Three things decide how long a rest is, most specific first:
 *
 *   1. `set.rest_seconds`         an override on one individual set
 *   2. `exercise.rest_by_type[t]` the exercise's own rest for that set type
 *   3. DEFAULT_REST_SECONDS[t]    the app default for that set type
 *
 * Rest is per set type because a warm-up does not need the same recovery as a
 * working set, and a drop set is meant to be taken almost immediately
 *
 * Nothing here touches React or the DOM, so every rule can be tested directly
 */

import {
  DEFAULT_SET_TYPE,
  SET_TYPES,
  type SetType,
} from '@/lib/workouts/constants';

export type { SetType };

/* App defaults in seconds, used when neither the set nor the exercise says */
export const DEFAULT_REST_SECONDS: Record<SetType, number> = {
  working: 90,
  W: 30,
  D: 10,
  F: 120,
};

/* Step used by the plus and minus buttons on the running timer */
export const REST_STEP_SECONDS = 15;

/* A rest longer than this is almost certainly a typo */
export const MAX_REST_SECONDS = 3600;

export interface RestSet {
  set?: number;
  set_type?: string | null;
  completed?: boolean;
  rest_seconds?: number | null;
}

export interface RestExercise {
  id?: string;
  name?: string;
  superset_id?: string | null;
  rest_by_type?: Partial<Record<SetType, number>> | null;
  sets?: RestSet[];
}

export interface RestPlan {
  seconds: number;
  label: string;
}

/* Anything unrecognised counts as a working set */
export function normalizeSetType(value: unknown): SetType {
  return SET_TYPES.includes(value as SetType)
    ? (value as SetType)
    : DEFAULT_SET_TYPE;
}

/*
 * Turn a form value into a stored rest, or null meaning "inherit"
 *
 * Blank clears the override. Zero is kept because "no rest at all" is a real
 * choice a user can make, so it must be distinguishable from blank
 */
export function parseRestInput(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (text === '') return null;
  const parsed = Number(text);
  if (!Number.isFinite(parsed)) return null;
  return clampRestSeconds(parsed);
}

export function clampRestSeconds(seconds: number): number {
  if (Number.isNaN(seconds)) return 0;
  return Math.min(Math.max(Math.round(seconds), 0), MAX_REST_SECONDS);
}

/* The exercise's rest for a set type, ignoring any per-set override */
export function exerciseRestSeconds(
  exercise: RestExercise | null | undefined,
  setType: unknown,
): number {
  const type = normalizeSetType(setType);
  const configured = exercise?.rest_by_type?.[type];
  if (typeof configured === 'number' && Number.isFinite(configured)) {
    return clampRestSeconds(configured);
  }
  return DEFAULT_REST_SECONDS[type];
}

/* The rest that actually applies to one set */
export function resolveRestSeconds(
  exercise: RestExercise | null | undefined,
  set: RestSet | null | undefined,
): number {
  const override = set?.rest_seconds;
  if (typeof override === 'number' && Number.isFinite(override)) {
    return clampRestSeconds(override);
  }
  return exerciseRestSeconds(exercise, set?.set_type);
}

/* True when this set carries its own rest rather than inheriting one */
export function hasRestOverride(set: RestSet | null | undefined): boolean {
  const override = set?.rest_seconds;
  return typeof override === 'number' && Number.isFinite(override);
}

export function formatRest(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/*
 * Every exercise linked into the same superset as the one at `index`
 *
 * A superset is a contiguous run of exercises sharing one `superset_id`, which
 * is how `toggleSuperset` builds them. Walking outwards from the index rather
 * than filtering the whole list means two separate supersets that happen to
 * reuse an id never merge into one group
 */
export function supersetGroupIndexes(
  exercises: RestExercise[],
  index: number,
): number[] {
  const current = exercises[index];
  if (!current) return [];

  const id = current.superset_id;
  if (!id) return [index];

  let first = index;
  while (first > 0 && exercises[first - 1]?.superset_id === id) first -= 1;

  let last = index;
  while (
    last < exercises.length - 1 &&
    exercises[last + 1]?.superset_id === id
  ) {
    last += 1;
  }

  const group: number[] = [];
  for (let i = first; i <= last; i += 1) group.push(i);
  return group;
}

/*
 * Whether the round is over and rest should begin
 *
 * In a superset you move straight to the next exercise instead of resting, so
 * the timer waits until the same set number is checked off on every exercise in
 * the group. Exercises with fewer sets than the round simply do not hold it up
 */
function isRoundComplete(
  exercises: RestExercise[],
  group: number[],
  setIndex: number,
): boolean {
  return group.every((i) => {
    const set = exercises[i]?.sets?.[setIndex];
    return !set || set.completed === true;
  });
}

/*
 * What to rest for after a set was checked, or null if nothing should start
 *
 * Returns null when the set was unchecked instead of checked, when a superset
 * round is still unfinished, or when the resolved rest is zero
 *
 * A superset takes the longest rest of the exercises in it, so the timer never
 * ends before the hardest of them has recovered
 */
export function planRestAfterSet(
  exercises: RestExercise[],
  exerciseId: string,
  setIndex: number,
): RestPlan | null {
  const index = exercises.findIndex((ex) => ex.id === exerciseId);
  if (index === -1) return null;

  const set = exercises[index]?.sets?.[setIndex];
  if (!set || set.completed !== true) return null;

  const group = supersetGroupIndexes(exercises, index);
  if (!isRoundComplete(exercises, group, setIndex)) return null;

  const seconds = Math.max(
    ...group.map((i) =>
      resolveRestSeconds(exercises[i], exercises[i]?.sets?.[setIndex]),
    ),
  );
  if (seconds <= 0) return null;

  const label =
    group.length > 1
      ? `Superset · Set ${setIndex + 1}`
      : `${exercises[index].name || 'Exercise'} · Set ${setIndex + 1}`;

  return { seconds, label };
}

/*
 * Set or clear an exercise's rest for one set type
 *
 * Passing null drops the key so the app default applies again, which keeps the
 * stored routine free of values that only repeat a default
 */
export function withExerciseRest<T extends RestExercise>(
  exercises: T[],
  exerciseId: string,
  setType: SetType,
  seconds: number | null,
): T[] {
  return exercises.map((ex) => {
    if (ex.id !== exerciseId) return ex;
    const next = { ...(ex.rest_by_type || {}) };
    if (seconds === null) delete next[setType];
    else next[setType] = clampRestSeconds(seconds);
    return {
      ...ex,
      rest_by_type: Object.keys(next).length > 0 ? next : null,
    };
  });
}

/* Set or clear the rest override on one individual set */
export function withSetRest<T extends RestExercise>(
  exercises: T[],
  exerciseId: string,
  setIndex: number,
  seconds: number | null,
): T[] {
  return exercises.map((ex) => {
    if (ex.id !== exerciseId) return ex;
    const sets = [...(ex.sets || [])];
    if (!sets[setIndex]) return ex;
    sets[setIndex] = {
      ...sets[setIndex],
      rest_seconds: seconds === null ? null : clampRestSeconds(seconds),
    };
    return { ...ex, sets };
  });
}
