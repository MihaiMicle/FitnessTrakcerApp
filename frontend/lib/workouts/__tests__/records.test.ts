import { describe, it, expect } from 'vitest';
import {
  beatsSet,
  checkSetAgainstRecords,
  EMPTY_RECORDS,
  estimate1RM,
  recordToast,
  summarizeHistory,
} from '../records';

/*
 * These rules used to live inline in WorkoutContext, where the only way to
 * check them was to log a set in a browser. The one that matters is the zero
 * baseline: a brand new exercise has no records, and treating its empty
 * baseline as a number to beat fires a personal best on the very first set
 */

describe('estimate1RM', () => {
  it('returns the bar weight for a single', () => {
    expect(estimate1RM(100, 1)).toBeCloseTo(103.33, 2);
  });

  it('grows with reps at the same weight', () => {
    expect(estimate1RM(100, 8)).toBeGreaterThan(estimate1RM(100, 5));
  });

  it('is zero when either input is missing', () => {
    expect(estimate1RM(0, 5)).toBe(0);
    expect(estimate1RM(100, 0)).toBe(0);
    expect(estimate1RM(-100, 5)).toBe(0);
  });
});

describe('beatsSet', () => {
  const best = { weight_kg: 100, reps: 5 };

  it('counts more weight as a win', () => {
    expect(beatsSet({ weight_kg: 102.5, reps: 3 }, best)).toBe(true);
  });

  it('counts more reps at the same weight as a win', () => {
    expect(beatsSet({ weight_kg: 100, reps: 6 }, best)).toBe(true);
  });

  it('does not count more reps at less weight', () => {
    expect(beatsSet({ weight_kg: 95, reps: 12 }, best)).toBe(false);
  });

  it('does not count a tie', () => {
    expect(beatsSet({ weight_kg: 100, reps: 5 }, best)).toBe(false);
  });
});

describe('summarizeHistory', () => {
  it('is empty for no history', () => {
    expect(summarizeHistory([])).toEqual(EMPTY_RECORDS);
  });

  it('takes the best 1RM and volume across the whole history', () => {
    const records = summarizeHistory([
      { weight_kg: 100, reps: 5, set_number: 1 },
      { weight_kg: 80, reps: 12, set_number: 2 },
    ]);
    expect(records.max1RM).toBeCloseTo(estimate1RM(100, 5), 5);
    expect(records.maxVolume).toBe(960);
  });

  it('keys best sets by index, not by absolute weight', () => {
    const records = summarizeHistory([
      { weight_kg: 100, reps: 5, set_number: 1 },
      { weight_kg: 60, reps: 5, set_number: 3 },
    ]);
    expect(records.bestSets[0]).toEqual({ weight_kg: 100, reps: 5 });
    expect(records.bestSets[2]).toEqual({ weight_kg: 60, reps: 5 });
  });

  it('defaults a missing set_number to the first set', () => {
    const records = summarizeHistory([{ weight_kg: 50, reps: 5 }]);
    expect(records.bestSets[0]).toEqual({ weight_kg: 50, reps: 5 });
  });

  it('skips warmups and rows with no numbers', () => {
    const records = summarizeHistory([
      { weight_kg: null, reps: 5, set_number: 1 },
      { weight_kg: 100, reps: null, set_number: 2 },
    ]);
    expect(records).toEqual(EMPTY_RECORDS);
  });
});

describe('checkSetAgainstRecords', () => {
  const records = summarizeHistory([
    { weight_kg: 100, reps: 5, set_number: 1 },
    { weight_kg: 100, reps: 5, set_number: 2 },
  ]);

  it('celebrates nothing on the first ever set of an exercise', () => {
    const check = checkSetAgainstRecords(EMPTY_RECORDS, 0, 200, 10);
    expect(check.is1RM).toBe(false);
    expect(check.isVolume).toBe(false);
    expect(check.isSetProgression).toBe(false);
    expect(check.isFirstForSet).toBe(true);
    expect(recordToast(check, 'Squat', 0)).toBeNull();
  });

  it('flags a new 1RM and stores it', () => {
    const check = checkSetAgainstRecords(records, 0, 110, 5);
    expect(check.is1RM).toBe(true);
    expect(check.records.max1RM).toBeCloseTo(estimate1RM(110, 5), 5);
  });

  it('flags a volume PR when the 1RM did not move', () => {
    /* Light and long: more tonnage than 100x5, but a lower estimated max */
    const check = checkSetAgainstRecords(records, 0, 60, 10);
    expect(check.is1RM).toBe(false);
    expect(check.isVolume).toBe(true);
  });

  it('flags set progression alone when the all time records stand', () => {
    const mixed = summarizeHistory([
      { weight_kg: 100, reps: 5, set_number: 1 },
      { weight_kg: 60, reps: 5, set_number: 2 },
    ]);
    const check = checkSetAgainstRecords(mixed, 1, 70, 5);
    expect(check.is1RM).toBe(false);
    expect(check.isVolume).toBe(false);
    expect(check.isSetProgression).toBe(true);
  });

  it('flags set progression for an untouched set index', () => {
    const check = checkSetAgainstRecords(records, 5, 60, 8);
    expect(check.isFirstForSet).toBe(true);
    expect(check.records.bestSets[5]).toEqual({ weight_kg: 60, reps: 8 });
  });

  it('reports no change and keeps the original object for a worse set', () => {
    const check = checkSetAgainstRecords(records, 0, 80, 3);
    expect(check.changed).toBe(false);
    expect(check.records).toBe(records);
  });

  it('ignores a set with no weight or reps', () => {
    const check = checkSetAgainstRecords(records, 0, 0, 0);
    expect(check.changed).toBe(false);
    expect(check.records).toBe(records);
  });

  it('does not mutate the records it was given', () => {
    const before = JSON.parse(JSON.stringify(records));
    checkSetAgainstRecords(records, 0, 150, 10);
    expect(records).toEqual(before);
  });
});

describe('recordToast', () => {
  const records = summarizeHistory([
    { weight_kg: 100, reps: 5, set_number: 1 },
  ]);

  it('shows only the biggest record when several break at once', () => {
    const check = checkSetAgainstRecords(records, 0, 140, 10);
    expect(check.is1RM).toBe(true);
    expect(check.isVolume).toBe(true);
    expect(recordToast(check, 'Squat', 0)?.message).toContain('1RM');
  });

  it('names the volume record when only tonnage moved', () => {
    const check = checkSetAgainstRecords(records, 0, 60, 10);
    expect(recordToast(check, 'Squat', 0)?.message).toContain('volume');
  });

  it('numbers the set from one for the reader', () => {
    const mixed = summarizeHistory([
      { weight_kg: 100, reps: 5, set_number: 1 },
      { weight_kg: 60, reps: 5, set_number: 2 },
    ]);
    const check = checkSetAgainstRecords(mixed, 1, 70, 5);
    expect(recordToast(check, 'Squat', 1)?.message).toContain('set 2');
  });
});
