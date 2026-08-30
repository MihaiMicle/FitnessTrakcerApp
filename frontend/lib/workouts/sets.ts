/* lib/workouts/sets.ts */

import { FIELD_KEYS } from './fields';

/*
 * Every function here takes an exercise array and returns a new one. Keeping
 * them pure means the live logger and the context share one definition of what
 * a superset is, and the rules can be tested without mounting a component
 */

export interface WorkoutSet {
  set: number;
  set_type: string;
  completed: boolean;
  [key: string]: unknown;
}

export interface WorkoutExercise {
  id: string;
  name: string;
  type?: string;
  tracking_fields?: string[];
  superset_id?: string | null;
  sets: WorkoutSet[];
  [key: string]: unknown;
}

/* Append a set, carrying the previous set's numbers forward as a starting point */
export function addSetTo(exercises: WorkoutExercise[], exId: string) {
  return exercises.map((ex) => {
    if (ex.id !== exId) return ex;

    const lastSet = ex.sets[ex.sets.length - 1];
    const newSet: WorkoutSet = {
      set: ex.sets.length + 1,
      set_type: 'working',
      completed: false,
    };
    for (const field of ex.tracking_fields ?? []) {
      const key = FIELD_KEYS[field];
      if (key) newSet[key] = lastSet ? lastSet[key] : '';
    }

    return { ...ex, sets: [...ex.sets, newSet] };
  });
}

/* Write one field of one set */
export function updateSetField(
  exercises: WorkoutExercise[],
  exId: string,
  setIndex: number,
  field: string,
  value: unknown,
) {
  return exercises.map((ex) => {
    if (ex.id !== exId) return ex;
    const sets = [...ex.sets];
    sets[setIndex] = { ...sets[setIndex], [field]: value };
    return { ...ex, sets };
  });
}

/* Flip a set between done and not done */
export function toggleSetCompleted(
  exercises: WorkoutExercise[],
  exId: string,
  setIndex: number,
) {
  return exercises.map((ex) => {
    if (ex.id !== exId) return ex;
    const sets = [...ex.sets];
    sets[setIndex] = {
      ...sets[setIndex],
      completed: !sets[setIndex].completed,
    };
    return { ...ex, sets };
  });
}

export function updateSetTypeIn(
  exercises: WorkoutExercise[],
  exId: string,
  setIndex: number,
  type: string,
) {
  return updateSetField(exercises, exId, setIndex, 'set_type', type);
}

/* Drop a set and renumber the rest so the badges stay 1..n */
export function removeSetFrom(
  exercises: WorkoutExercise[],
  exId: string,
  setIndex: number,
) {
  return exercises.map((ex) => {
    if (ex.id !== exId) return ex;
    const sets = ex.sets
      .filter((_, i) => i !== setIndex)
      .map((s, i) => ({ ...s, set: i + 1 }));
    return { ...ex, sets };
  });
}

export function removeExerciseFrom(exercises: WorkoutExercise[], exId: string) {
  return exercises.filter((ex) => ex.id !== exId);
}

/*
 * Link or unlink an exercise with the one above it. Unlinking also clears the
 * exercise above when nothing else is left in its group, since a superset of
 * one is just an exercise wearing a badge
 */
export function toggleSupersetAt(exercises: WorkoutExercise[], index: number) {
  if (index <= 0 || index >= exercises.length) return exercises;

  const next = [...exercises];
  const current = next[index];
  const previous = next[index - 1];

  if (current.superset_id && current.superset_id === previous.superset_id) {
    next[index] = { ...current, superset_id: null };
    const previousIsOrphaned = !next.some(
      (ex, i) => i !== index - 1 && ex.superset_id === previous.superset_id,
    );
    if (previousIsOrphaned) {
      next[index - 1] = { ...previous, superset_id: null };
    }
    return next;
  }

  const groupId = previous.superset_id || `ss-${Date.now()}`;
  next[index - 1] = { ...previous, superset_id: groupId };
  next[index] = { ...current, superset_id: groupId };
  return next;
}

/* Whether an exercise is grouped with its neighbour above or below */
export function isInSuperset(exercises: WorkoutExercise[], index: number) {
  const ex = exercises[index];
  if (!ex?.superset_id) return false;
  const above = exercises[index - 1];
  const below = exercises[index + 1];
  return (
    above?.superset_id === ex.superset_id ||
    below?.superset_id === ex.superset_id
  );
}

/* First set not yet ticked off, used to label the rest timer */
export function findNextSet(exercises: WorkoutExercise[]) {
  for (const ex of exercises) {
    const setIndex = ex.sets.findIndex((s) => !s.completed);
    if (setIndex !== -1) {
      return { exercise: ex, setIndex, set: ex.sets[setIndex] };
    }
  }
  return null;
}

/* Move an exercise, dropping its superset link so the group stays contiguous */
export function reorderExercises(
  exercises: WorkoutExercise[],
  from: number,
  to: number,
) {
  if (from === to || from < 0 || to < 0) return exercises;
  const next = [...exercises];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, { ...moved, superset_id: null });
  return next;
}

/* Copy of a session with every set marked undone, for saving it as a routine */
export function asRoutineExercises(
  exercises: WorkoutExercise[],
): WorkoutExercise[] {
  return exercises.map((ex) => ({
    ...ex,
    sets: ex.sets.map((s) => ({ ...s, completed: false })),
  }));
}
