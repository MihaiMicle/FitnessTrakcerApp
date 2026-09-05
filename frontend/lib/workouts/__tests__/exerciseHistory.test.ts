/* lib/workouts/__tests__/exerciseHistory.test.ts */

import { describe, expect, it } from 'vitest';
import {
  bestSetByEstimated1RM,
  buildProgressChart,
  calculatorOneRepMax,
  chartFloor,
  groupHistoryByDate,
  type ExerciseHistorySet,
} from '../exerciseHistory';
import { estimate1RM } from '../records';

function set(overrides: Partial<ExerciseHistorySet> = {}): ExerciseHistorySet {
  return {
    created_at: '2026-08-01T10:00:00Z',
    weight_kg: 100,
    reps: 5,
    ...overrides,
  };
}

describe('bestSetByEstimated1RM', () => {
  it('returns null for an empty history', () => {
    expect(bestSetByEstimated1RM([])).toBeNull();
  });

  it('picks the set with the highest estimated 1RM', () => {
    const best = bestSetByEstimated1RM([
      set({ weight_kg: 100, reps: 5 }),
      set({ weight_kg: 120, reps: 3 }),
      set({ weight_kg: 80, reps: 8 }),
    ]);
    expect(best).toEqual({ weight_kg: 120, reps: 3 });
  });

  it('ignores sets with no weight or reps', () => {
    const best = bestSetByEstimated1RM([
      set({ weight_kg: 0, reps: 5 }),
      set({ weight_kg: 100, reps: 0 }),
      set({ weight_kg: null, reps: 5 }),
    ]);
    expect(best).toBeNull();
  });

  it('ignores negative values', () => {
    expect(bestSetByEstimated1RM([set({ weight_kg: -50, reps: 5 })])).toBeNull();
  });

  it('coerces numeric strings the same way the rest of the app does', () => {
    const best = bestSetByEstimated1RM([
      set({ weight_kg: '100' as any, reps: '5' as any }),
    ]);
    expect(best).toEqual({ weight_kg: 100, reps: 5 });
  });

  it('matches estimate1RM directly on a single set', () => {
    const history = [set({ weight_kg: 60, reps: 10 })];
    const best = bestSetByEstimated1RM(history);
    expect(estimate1RM(best!.weight_kg, best!.reps)).toBe(estimate1RM(60, 10));
  });
});

describe('groupHistoryByDate', () => {
  it('buckets sets under their calendar day', () => {
    const groups = groupHistoryByDate([
      set({ created_at: '2026-08-01T09:00:00Z' }),
      set({ created_at: '2026-08-01T18:00:00Z' }),
      set({ created_at: '2026-08-02T09:00:00Z' }),
    ]);
    expect(groups['2026-08-01']).toHaveLength(2);
    expect(groups['2026-08-02']).toHaveLength(1);
  });

  it('handles an empty history', () => {
    expect(groupHistoryByDate([])).toEqual({});
  });
});

describe('buildProgressChart', () => {
  it('returns no chart data or progression for an empty history', () => {
    expect(buildProgressChart([], 'strength')).toEqual({
      chartData: [],
      progression: null,
    });
  });

  it('collapses sets from the same day into one point using the heaviest weight', () => {
    const { chartData } = buildProgressChart(
      [
        set({ created_at: '2026-08-01T09:00:00Z', weight_kg: 100, reps: 5 }),
        set({ created_at: '2026-08-01T09:05:00Z', weight_kg: 110, reps: 3 }),
      ],
      'strength',
    );
    expect(chartData).toHaveLength(1);
    expect(chartData[0].maxWeight).toBe(110);
  });

  it('sums volume across sets on the same day', () => {
    const { chartData } = buildProgressChart(
      [
        set({ weight_kg: 100, reps: 5 }), // 500
        set({ weight_kg: 100, reps: 3 }), // 300
      ],
      'strength',
    );
    expect(chartData[0].totalVolume).toBe(800);
  });

  it('orders points chronologically regardless of input order', () => {
    const { chartData } = buildProgressChart(
      [
        set({ created_at: '2026-08-03T09:00:00Z', weight_kg: 130, reps: 1 }),
        set({ created_at: '2026-08-01T09:00:00Z', weight_kg: 110, reps: 1 }),
        set({ created_at: '2026-08-02T09:00:00Z', weight_kg: 120, reps: 1 }),
      ],
      'strength',
    );
    expect(chartData.map((d) => d.maxWeight)).toEqual([110, 120, 130]);
  });

  it('needs at least two days to report a progression', () => {
    const { progression } = buildProgressChart([set()], 'strength');
    expect(progression).toBeNull();
  });

  it('compares max weight for a strength exercise', () => {
    const { progression } = buildProgressChart(
      [
        set({ created_at: '2026-08-01T09:00:00Z', weight_kg: 100, reps: 5 }),
        set({ created_at: '2026-08-02T09:00:00Z', weight_kg: 110, reps: 5 }),
      ],
      'strength',
    );
    expect(progression).toEqual({
      type: 'strength',
      diff: 10,
      current: 110,
      previous: 100,
    });
  });

  it('compares distance for a cardio exercise that logs distance', () => {
    const { progression } = buildProgressChart(
      [
        set({
          created_at: '2026-08-01T09:00:00Z',
          distance_km: 5,
          weight_kg: 0,
          reps: 0,
        }),
        set({
          created_at: '2026-08-02T09:00:00Z',
          distance_km: 6,
          weight_kg: 0,
          reps: 0,
        }),
      ],
      'cardio',
    );
    expect(progression?.type).toBe('distance');
    expect(progression?.diff).toBe(1);
  });

  it('falls back to time for a cardio exercise with no distance', () => {
    const { progression } = buildProgressChart(
      [
        set({
          created_at: '2026-08-01T09:00:00Z',
          duration_minutes: 20,
          weight_kg: 0,
          reps: 0,
        }),
        set({
          created_at: '2026-08-02T09:00:00Z',
          duration_minutes: 25,
          weight_kg: 0,
          reps: 0,
        }),
      ],
      'cardio',
    );
    expect(progression?.type).toBe('time');
    expect(progression?.diff).toBe(5);
  });

  it('reports a negative diff when the most recent session regressed', () => {
    const { progression } = buildProgressChart(
      [
        set({ created_at: '2026-08-01T09:00:00Z', weight_kg: 110, reps: 5 }),
        set({ created_at: '2026-08-02T09:00:00Z', weight_kg: 100, reps: 5 }),
      ],
      'strength',
    );
    expect(progression?.diff).toBe(-10);
  });
});

describe('chartFloor', () => {
  it('is zero for an empty chart', () => {
    expect(chartFloor([])).toBe(0);
  });

  it('floors just under the lowest max weight', () => {
    const floor = chartFloor([
      { date: 'a', maxWeight: 100, totalVolume: 0, totalDistance: 0, totalTime: 0 },
      { date: 'b', maxWeight: 120, totalVolume: 0, totalDistance: 0, totalTime: 0 },
    ]);
    expect(floor).toBe(Math.floor(100 * 0.9));
  });
});

describe('calculatorOneRepMax', () => {
  it('returns the weight itself for a single rep, not the Epley estimate', () => {
    // A single rep at 100kg IS a 100kg 1RM, not 103.3kg
    expect(calculatorOneRepMax(100, 1)).toBe(100);
  });

  it('rounds the Epley estimate for more than one rep', () => {
    expect(calculatorOneRepMax(100, 5)).toBe(Math.round(estimate1RM(100, 5)));
  });

  it('returns null when weight is missing', () => {
    expect(calculatorOneRepMax('', 5)).toBeNull();
  });

  it('returns null when reps is missing', () => {
    expect(calculatorOneRepMax(100, '')).toBeNull();
  });

  it('returns null for zero or negative reps', () => {
    expect(calculatorOneRepMax(100, 0)).toBeNull();
    expect(calculatorOneRepMax(100, -1)).toBeNull();
  });
});
