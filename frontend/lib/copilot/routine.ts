/* lib/copilot/routine.ts */

import { FIELD_KEYS } from '@/lib/workouts/fields';
import { DEFAULT_TRACKING_FIELDS } from '@/lib/workouts/constants';
import type { WorkoutExercise, WorkoutSet } from '@/lib/workouts/sets';
import type { CopilotExercise, CopilotRoutine } from './types';

/*
 * Turning a model suggestion into something the logger can actually run.
 *
 * The model returns names and numbers. The app needs ids, set indexes,
 * completed flags and tracking_fields, and it needs them to match what
 * RoutineEditor and LiveWorkout already produce, or a copilot-built routine
 * behaves subtly differently from a hand-built one
 */

const CARDIO_FIELDS = ['distance', 'time'];
const STRENGTH_FIELDS = ['weight', 'reps', 'rir'];

export interface LibraryExercise {
  name: string;
  type?: string;
  tracking_fields?: string[];
  primary_muscle?: string | null;
}

/* Case-insensitive match against the user's library. A library hit carries the
   real tracking_fields, so the set inputs render the right columns instead of
   falling back to weight and reps for a treadmill */
export function matchLibraryExercise(
  name: string,
  library: LibraryExercise[],
): LibraryExercise | null {
  const target = name.trim().toLowerCase();
  return library.find((ex) => ex.name.trim().toLowerCase() === target) ?? null;
}

export function resolveTrackingFields(
  suggestion: CopilotExercise,
  match: LibraryExercise | null,
): string[] {
  if (match?.tracking_fields?.length) return match.tracking_fields;
  if (suggestion.type === 'cardio') return CARDIO_FIELDS;
  return STRENGTH_FIELDS.length ? STRENGTH_FIELDS : DEFAULT_TRACKING_FIELDS;
}

/* One suggested set to a logger set. Only fields the exercise actually tracks
   are written, so a cardio set never carries a stray weight_kg */
export function toWorkoutSet(
  set: CopilotSetLike,
  index: number,
  trackingFields: string[],
): WorkoutSet {
  const result: WorkoutSet = {
    set: index + 1,
    set_type: 'working',
    completed: false,
  };

  for (const field of trackingFields) {
    const key = FIELD_KEYS[field];
    if (!key) continue;
    const value = (set as Record<string, unknown>)[key];
    result[key] = value === null || value === undefined ? '' : value;
  }

  return result;
}

type CopilotSetLike = Record<string, unknown>;

/*
 * Ids are derived from a caller-supplied seed rather than Date.now() so two
 * exercises added in the same millisecond cannot collide, and so the output is
 * deterministic under test
 */
export function toWorkoutExercises(
  suggestions: CopilotExercise[],
  library: LibraryExercise[] = [],
  seed: number = Date.now(),
): WorkoutExercise[] {
  return suggestions.map((suggestion, index) => {
    const match = matchLibraryExercise(suggestion.name, library);
    const trackingFields = resolveTrackingFields(suggestion, match);
    const sets = (suggestion.sets?.length ? suggestion.sets : [{}]).map((s, i) =>
      toWorkoutSet(s as CopilotSetLike, i, trackingFields),
    );

    return {
      id: `ex-${seed}-${index}`,
      name: match?.name ?? suggestion.name,
      type: match?.type ?? suggestion.type ?? 'strength',
      notes: suggestion.note ?? suggestion.reason ?? '',
      tracking_fields: trackingFields,
      superset_id: null,
      sets,
    };
  });
}

/* The body of a POST /workouts/templates request */
export function toTemplatePayload(
  routine: CopilotRoutine,
  library: LibraryExercise[] = [],
  seed: number = Date.now(),
): { name: string; exercises: WorkoutExercise[] } {
  return {
    name: routine.name?.trim() || 'New routine',
    exercises: toWorkoutExercises(routine.exercises ?? [], library, seed),
  };
}

/* Guard for the card. A routine with no exercises must not render a save
   button that would create an empty template */
export function isUsableRoutine(routine: unknown): routine is CopilotRoutine {
  if (!routine || typeof routine !== 'object') return false;
  const candidate = routine as CopilotRoutine;
  return Array.isArray(candidate.exercises) && candidate.exercises.length > 0;
}

/* Reading line under a routine card: "5 exercises · 18 sets" */
export function describeRoutine(routine: CopilotRoutine): string {
  const exercises = routine.exercises?.length ?? 0;
  const sets = (routine.exercises ?? []).reduce(
    (total, ex) => total + (ex.sets?.length ?? 0),
    0,
  );
  const exerciseLabel = exercises === 1 ? 'exercise' : 'exercises';
  const setLabel = sets === 1 ? 'set' : 'sets';
  return `${exercises} ${exerciseLabel} · ${sets} ${setLabel}`;
}
