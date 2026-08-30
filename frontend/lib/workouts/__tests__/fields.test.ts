import { describe, it, expect } from 'vitest';
import { FIELD_KEYS, FIELD_LABELS, formatPreviousSet } from '../fields';
import { formatClock, sessionTotals } from '../session';

/* FIELD_KEYS used to be declared twice, once in LiveWorkout and once in
   WorkoutContext. Pinning it means a rename cannot drift between them again */

describe('FIELD_KEYS', () => {
  it('has a label for every key', () => {
    expect(Object.keys(FIELD_LABELS).sort()).toEqual(
      Object.keys(FIELD_KEYS).sort(),
    );
  });

  it('maps to distinct set properties', () => {
    const values = Object.values(FIELD_KEYS);
    expect(new Set(values).size).toBe(values.length);
  });
});

describe('formatPreviousSet', () => {
  it('is a dash when there is nothing to show', () => {
    expect(formatPreviousSet(null, ['weight', 'reps'])).toBe('-');
    expect(formatPreviousSet({}, ['weight', 'reps'])).toBe('-');
  });

  it('joins weight and reps', () => {
    expect(
      formatPreviousSet({ weight_kg: 100, reps: 5 }, ['weight', 'reps']),
    ).toBe('100kg x 5');
  });

  it('spells out reps when there is no weight beside them', () => {
    expect(formatPreviousSet({ reps: 8 }, ['reps'])).toBe('8 reps');
  });

  it('only shows fields the exercise tracks', () => {
    expect(formatPreviousSet({ weight_kg: 100, reps: 5 }, ['reps'])).toBe(
      '5 reps',
    );
  });

  it('formats cardio', () => {
    expect(
      formatPreviousSet({ distance_km: 5, duration_minutes: 25 }, [
        'distance',
        'time',
      ]),
    ).toBe('5km in 25m');
  });

  it('treats a zero as a real value rather than missing', () => {
    expect(formatPreviousSet({ reps: 0 }, ['reps'])).toBe('0 reps');
  });
});

describe('formatClock', () => {
  it('is mm:ss under an hour', () => {
    expect(formatClock(0)).toBe('00:00');
    expect(formatClock(65)).toBe('01:05');
  });

  it('adds hours once there are any', () => {
    expect(formatClock(3661)).toBe('1:01:01');
  });

  it('never shows a negative clock', () => {
    expect(formatClock(-30)).toBe('00:00');
  });
});

describe('sessionTotals', () => {
  const exercises = [
    {
      sets: [
        { completed: true, weight_kg: 100, reps: 5 },
        { completed: false, weight_kg: 100, reps: 5 },
      ],
    },
    { sets: [{ completed: true, weight_kg: 60, reps: 10 }] },
  ];

  it('counts only completed sets', () => {
    expect(sessionTotals(exercises).sets).toBe(2);
  });

  it('sums tonnage from completed sets only', () => {
    expect(sessionTotals(exercises).volume).toBe(1100);
  });

  it('is zero for an empty session', () => {
    expect(sessionTotals([])).toEqual({ sets: 0, volume: 0 });
    expect(sessionTotals()).toEqual({ sets: 0, volume: 0 });
  });

  it('skips an exercise that has no sets array yet', () => {
    expect(sessionTotals([{}, { sets: [] }])).toEqual({ sets: 0, volume: 0 });
  });

  it('treats a bodyweight set as zero volume, not as a crash', () => {
    expect(sessionTotals([{ sets: [{ completed: true, reps: 10 }] }])).toEqual({
      sets: 1,
      volume: 0,
    });
  });
});
