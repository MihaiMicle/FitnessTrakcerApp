import { describe, it, expect } from 'vitest';
import {
  DEFAULT_TRACKING_FIELDS,
  EQUIPMENT,
  MUSCLES,
  TRACKING_TYPES,
} from '../constants';

/*
 * These lists are reference data, but they are load-bearing reference data
 *
 * `TRACKING_TYPES[].fields` decides which inputs a set renders, and therefore
 * which columns the normalised `workout_sets` table has to hold. Phase 5's
 * muscle distribution and muscle group ranking group by `primary_muscle`,
 * which must come from MUSCLES. Pinning them here means a rename shows up as a
 * test failure rather than as an exercise that silently stops counting toward
 * a chart
 */

/* Every field with a column on WorkoutSet. Adding a tracking type that uses a
   field not in this list means the set has nowhere to be stored */
const KNOWN_SET_FIELDS = [
  'weight',
  'reps',
  'rir',
  'time',
  'distance',
  'incline',
  'speed',
  'difficulty',
];

describe('MUSCLES', () => {
  it('has no duplicates', () => {
    expect(new Set(MUSCLES).size).toBe(MUSCLES.length);
  });

  it('has no leading or trailing whitespace', () => {
    // These strings are compared against `primary_muscle` from the database.
    for (const muscle of MUSCLES) {
      expect(muscle).toBe(muscle.trim());
    }
  });

  it('covers every muscle group the phase 5 charts need to bucket', () => {
    for (const required of ['Chest', 'Lats', 'Quads', 'Hamstrings', 'Biceps', 'Triceps']) {
      expect(MUSCLES).toContain(required);
    }
  });
});

describe('EQUIPMENT', () => {
  it('has no duplicates', () => {
    expect(new Set(EQUIPMENT).size).toBe(EQUIPMENT.length);
  });

  it('offers an explicit "None" so bodyweight is not left blank', () => {
    expect(EQUIPMENT).toContain('None');
  });

  it('offers "Other" as an escape hatch', () => {
    expect(EQUIPMENT).toContain('Other');
  });
});

describe('TRACKING_TYPES', () => {
  it('has unique ids', () => {
    const ids = TRACKING_TYPES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every type a label, an example and at least one field', () => {
    for (const type of TRACKING_TYPES) {
      expect(type.label).toBeTruthy();
      expect(type.example).toBeTruthy();
      expect(type.fields.length).toBeGreaterThan(0);
    }
  });

  it('only uses fields the set model knows how to store', () => {
    // If this fails, `workout_sets` needs a new column before the tracking type can ship
    // That's the whole point of the assertion
    for (const type of TRACKING_TYPES) {
      for (const field of type.fields) {
        expect(KNOWN_SET_FIELDS).toContain(field);
      }
    }
  });

  it('never repeats a field within a type', () => {
    for (const type of TRACKING_TYPES) {
      expect(new Set(type.fields).size).toBe(type.fields.length);
    }
  });

  it('attaches rir only to rep-based types', () => {
    // Reps in reserve is meaningless for a timed plank or a run
    for (const type of TRACKING_TYPES) {
      if (type.fields.includes('rir')) {
        expect(type.fields).toContain('reps');
      }
    }
  });

  it('covers the strength types the roadmap assumes', () => {
    const ids = TRACKING_TYPES.map((t) => t.id);
    expect(ids).toContain('weight_reps');
    expect(ids).toContain('bw_reps');
  });

  it('covers a cardio-shaped type, so Exercise.type "cardio" is loggable', () => {
    const cardio = TRACKING_TYPES.find((t) => t.id === 'distance_duration');
    expect(cardio).toBeDefined();
    expect(cardio!.fields).toEqual(expect.arrayContaining(['distance', 'time']));
  });

  it('has no type that tracks both reps and time', () => {
    // A set is measured one way or the other. If this ever stops holding, the
    // 1RM and per-exercise statistics work needs to decide which one wins
    for (const type of TRACKING_TYPES) {
      expect(type.fields.includes('reps') && type.fields.includes('time')).toBe(false);
    }
  });
});

describe('DEFAULT_TRACKING_FIELDS', () => {
  it('matches an existing tracking type rather than inventing a shape', () => {
    const weightReps = TRACKING_TYPES.find((t) => t.id === 'weight_reps')!;
    for (const field of DEFAULT_TRACKING_FIELDS) {
      expect(weightReps.fields).toContain(field);
    }
  });

  it('only uses known set fields', () => {
    for (const field of DEFAULT_TRACKING_FIELDS) {
      expect(KNOWN_SET_FIELDS).toContain(field);
    }
  });
});
