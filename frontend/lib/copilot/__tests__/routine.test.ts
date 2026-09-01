/* lib/copilot/__tests__/routine.test.ts */

import { describe, it, expect } from 'vitest';
import {
  describeRoutine,
  isUsableRoutine,
  matchLibraryExercise,
  resolveTrackingFields,
  toTemplatePayload,
  toWorkoutExercises,
} from '../routine';
import type { CopilotExercise } from '../types';

const library = [
  {
    name: 'Bench Press',
    type: 'strength',
    tracking_fields: ['weight', 'reps', 'rir'],
    primary_muscle: 'Chest',
  },
  {
    name: 'Treadmill',
    type: 'cardio',
    tracking_fields: ['distance', 'time', 'incline', 'speed'],
    primary_muscle: 'Cardio',
  },
];

const bench: CopilotExercise = {
  name: 'bench press',
  type: 'strength',
  sets: [
    { weight_kg: 60, reps: 8, rir: 2 },
    { weight_kg: 65, reps: 6, rir: 1 },
  ],
};

describe('matchLibraryExercise', () => {
  it('matches ignoring case and padding', () => {
    expect(matchLibraryExercise('  BENCH press ', library)?.name).toBe(
      'Bench Press',
    );
  });

  it('returns null when the exercise is not in the library', () => {
    expect(matchLibraryExercise('Zercher Squat', library)).toBeNull();
  });
});

describe('resolveTrackingFields', () => {
  it('prefers the fields the library exercise already declares', () => {
    /* Otherwise a treadmill suggestion renders weight and reps inputs */
    const match = matchLibraryExercise('Treadmill', library);
    expect(resolveTrackingFields({ name: 'Treadmill', type: 'cardio', sets: [] }, match)).toEqual([
      'distance',
      'time',
      'incline',
      'speed',
    ]);
  });

  it('falls back to cardio fields for an unknown cardio exercise', () => {
    expect(
      resolveTrackingFields({ name: 'Rucking', type: 'cardio', sets: [] }, null),
    ).toEqual(['distance', 'time']);
  });

  it('falls back to strength fields for an unknown lift', () => {
    expect(
      resolveTrackingFields({ name: 'Zercher Squat', type: 'strength', sets: [] }, null),
    ).toEqual(['weight', 'reps', 'rir']);
  });
});

describe('toWorkoutExercises', () => {
  it('numbers sets from one and leaves them uncompleted', () => {
    const [exercise] = toWorkoutExercises([bench], library, 100);
    expect(exercise.sets.map((s) => s.set)).toEqual([1, 2]);
    expect(exercise.sets.every((s) => s.completed === false)).toBe(true);
  });

  it('uses the library casing rather than what the model typed', () => {
    expect(toWorkoutExercises([bench], library, 100)[0].name).toBe(
      'Bench Press',
    );
  });

  it('generates ids that do not collide within one call', () => {
    const result = toWorkoutExercises([bench, bench], library, 100);
    expect(result[0].id).not.toBe(result[1].id);
  });

  it('is deterministic for a given seed', () => {
    expect(toWorkoutExercises([bench], library, 42)[0].id).toBe(
      toWorkoutExercises([bench], library, 42)[0].id,
    );
  });

  it('writes only the fields the exercise tracks', () => {
    /* A cardio set carrying a stray weight_kg would show up in analytics as
       volume that was never lifted */
    const run: CopilotExercise = {
      name: 'Treadmill',
      type: 'cardio',
      sets: [{ distance_km: 5, duration_minutes: 28, weight_kg: 999 }],
    };
    const [exercise] = toWorkoutExercises([run], library, 1);
    expect(exercise.sets[0].distance_km).toBe(5);
    expect(exercise.sets[0].weight_kg).toBeUndefined();
  });

  it('turns a null weight into an empty input rather than the string null', () => {
    const vague: CopilotExercise = {
      name: 'Zercher Squat',
      type: 'strength',
      sets: [{ weight_kg: null, reps: 8, rir: null }],
    };
    const [exercise] = toWorkoutExercises([vague], library, 1);
    expect(exercise.sets[0].weight_kg).toBe('');
    expect(exercise.sets[0].reps).toBe(8);
  });

  it('gives an exercise with no sets one blank set', () => {
    const [exercise] = toWorkoutExercises(
      [{ name: 'Plank', type: 'strength', sets: [] }],
      library,
      1,
    );
    expect(exercise.sets).toHaveLength(1);
  });

  it('works with an empty library', () => {
    expect(toWorkoutExercises([bench], [], 1)[0].name).toBe('bench press');
  });
});

describe('toTemplatePayload', () => {
  it('carries the routine name through', () => {
    const payload = toTemplatePayload(
      { name: 'Upper A', exercises: [bench] },
      library,
      1,
    );
    expect(payload.name).toBe('Upper A');
    expect(payload.exercises).toHaveLength(1);
  });

  it('substitutes a name when the model left it blank', () => {
    expect(
      toTemplatePayload({ name: '   ', exercises: [bench] }, library, 1).name,
    ).toBe('New routine');
  });
});

describe('isUsableRoutine', () => {
  it('accepts a routine with exercises', () => {
    expect(isUsableRoutine({ name: 'A', exercises: [bench] })).toBe(true);
  });

  it('rejects a routine with no exercises', () => {
    /* The save button would create an empty template */
    expect(isUsableRoutine({ name: 'A', exercises: [] })).toBe(false);
  });

  it('rejects null', () => {
    expect(isUsableRoutine(null)).toBe(false);
  });
});

describe('describeRoutine', () => {
  it('counts exercises and sets', () => {
    expect(describeRoutine({ name: 'A', exercises: [bench] })).toBe(
      '1 exercise · 2 sets',
    );
  });

  it('pluralises correctly', () => {
    expect(describeRoutine({ name: 'A', exercises: [bench, bench] })).toBe(
      '2 exercises · 4 sets',
    );
  });

  it('handles an empty routine', () => {
    expect(describeRoutine({ name: 'A', exercises: [] })).toBe(
      '0 exercises · 0 sets',
    );
  });
});
