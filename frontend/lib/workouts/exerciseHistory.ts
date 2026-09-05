/* lib/workouts/exerciseHistory.ts */

/*
 * Turns a flat list of logged sets for one exercise into what the profile
 * view needs: an autofill weight/reps pair, a day-by-day chart, and a
 * grouped list for the "past performances" panel. No fetching here, so this
 * can be pinned with plain arrays and no component
 */

import { estimate1RM, type BestSet, type HistorySet } from './records';

export interface ExerciseHistorySet extends HistorySet {
  created_at: string;
}

/* The single set with the highest estimated 1RM, for prefilling the calculator */
export function bestSetByEstimated1RM(
  history: ExerciseHistorySet[],
): BestSet | null {
  let best: BestSet | null = null;
  let bestEstimate = 0;

  for (const set of history) {
    const weight = Number(set.weight_kg) || 0;
    const reps = Number(set.reps) || 0;
    if (weight <= 0 || reps <= 0) continue;

    const estimate = estimate1RM(weight, reps);
    if (estimate > bestEstimate) {
      bestEstimate = estimate;
      best = { weight_kg: weight, reps };
    }
  }

  return best;
}

/* Every logged set, bucketed under the calendar day it happened on */
export function groupHistoryByDate(
  history: ExerciseHistorySet[],
): Record<string, ExerciseHistorySet[]> {
  const groups: Record<string, ExerciseHistorySet[]> = {};
  for (const set of history) {
    const dateKey = new Date(set.created_at).toISOString().split('T')[0];
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(set);
  }
  return groups;
}

export interface DailyStat {
  date: string;
  maxWeight: number;
  totalVolume: number;
  totalDistance: number;
  totalTime: number;
}

export interface ProgressionStat {
  type: 'strength' | 'distance' | 'time';
  diff: number;
  current: number;
  previous: number;
}

export interface ProgressChart {
  chartData: DailyStat[];
  progression: ProgressionStat | null;
}

/* One row per calendar day the exercise was logged, oldest first, plus the
   change from the previous session that the progression badge shows */
export function buildProgressChart(
  history: ExerciseHistorySet[],
  exerciseType: string,
): ProgressChart {
  if (history.length === 0) {
    return { chartData: [], progression: null };
  }

  const statsByDate: Record<
    string,
    {
      dateObj: Date;
      maxWeight: number;
      totalVolume: number;
      totalDistance: number;
      totalTime: number;
    }
  > = {};

  for (const set of history) {
    const dateObj = new Date(set.created_at);
    const dateKey = dateObj.toISOString().split('T')[0];
    const weight = Number(set.weight_kg) || 0;
    const reps = Number(set.reps) || 0;
    const distance = Number(set.distance_km) || 0;
    const duration = Number(set.duration_minutes) || 0;
    const volume = weight * reps;

    const existing = statsByDate[dateKey];
    if (!existing) {
      statsByDate[dateKey] = {
        dateObj,
        maxWeight: weight,
        totalVolume: volume,
        totalDistance: distance,
        totalTime: duration,
      };
    } else {
      existing.maxWeight = Math.max(existing.maxWeight, weight);
      existing.totalVolume += volume;
      existing.totalDistance += distance;
      existing.totalTime += duration;
    }
  }

  const chartData: DailyStat[] = Object.values(statsByDate)
    .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())
    .map((stat) => ({
      date: stat.dateObj.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      }),
      maxWeight: Math.round(stat.maxWeight * 10) / 10,
      totalVolume: Math.round(stat.totalVolume * 10) / 10,
      totalDistance: Math.round(stat.totalDistance * 10) / 10,
      totalTime: Math.round(stat.totalTime * 10) / 10,
    }));

  return { chartData, progression: buildProgression(chartData, exerciseType) };
}

/* Last session vs the one before it, by max weight for strength or by
   distance/time (whichever the history actually has) for cardio */
function buildProgression(
  sortedData: DailyStat[],
  exerciseType: string,
): ProgressionStat | null {
  if (sortedData.length < 2) return null;

  const last = sortedData[sortedData.length - 1];
  const secondLast = sortedData[sortedData.length - 2];

  if (exerciseType === 'strength') {
    const diff = last.maxWeight - secondLast.maxWeight;
    return {
      type: 'strength',
      diff: Math.round(diff * 10) / 10,
      current: last.maxWeight,
      previous: secondLast.maxWeight,
    };
  }

  const isDistance = sortedData.some((d) => d.totalDistance > 0);
  const current = isDistance ? last.totalDistance : last.totalTime;
  const previous = isDistance ? secondLast.totalDistance : secondLast.totalTime;
  const diff = current - previous;

  return {
    type: isDistance ? 'distance' : 'time',
    diff: Math.round(diff * 10) / 10,
    current,
    previous,
  };
}

/* The chart's y axis starts just under the lowest max weight, not at zero,
   so small week-to-week changes are still visible */
export function chartFloor(chartData: DailyStat[]): number {
  if (chartData.length === 0) return 0;
  return Math.floor(Math.min(...chartData.map((d) => d.maxWeight)) * 0.9);
}

/* The calculator's estimate: the same Epley formula as estimate1RM, except a
   single rep is already a measured 1RM and isn't run through the formula,
   which would otherwise inflate it by the per-rep factor */
export function calculatorOneRepMax(
  weight: number | '',
  reps: number | '',
): number | null {
  if (!weight || !reps || reps <= 0) return null;
  if (reps === 1) return weight;
  return Math.round(estimate1RM(weight, reps));
}
