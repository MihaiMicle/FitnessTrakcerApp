/*
 * Lets @capgo/capacitor-health stand in for the native FitnessTrackerHealth
 * plugin on Android
 *
 * bridge.ts falls back to window.FitnessTrackerHealth when no plugin is
 * registered under that name, so this file is the plugin, it is just
 * TypeScript wrapping an existing one instead of compiled Kotlin. See
 * native/README.md for the two routes and why this one was chosen
 *
 * Coverage: weight, body fat, height, steps, active and resting energy,
 * heart rate, resting heart rate, distance, sleep, water and dietary energy
 * map straight onto Health Connect record types this package already wraps.
 * workout_minutes reads through queryWorkouts() since Health Connect has no
 * generic sample read for a workout, but nothing here can write a workout
 * back in, the package has no save call for it. protein_g, carbs_g and fat_g
 * have no Health Connect equivalent at all in this package, a full
 * NutritionRecord write is out of scope for now. All four stay on the file
 * import path
 */

import { Health, type HealthDataType } from '@capgo/capacitor-health';
import type { NativeHealthPlugin } from '@/lib/health/bridge';
import type { HealthMetric } from '@/lib/health/metrics';
import type { RawHealthRecord } from '@/lib/health/types';

/* Canonical metric to this package's data type, for everything but workouts */
const METRIC_TO_DATA_TYPE: Partial<Record<HealthMetric, HealthDataType>> = {
  weight_kg: 'weight',
  body_fat_percent: 'bodyFat',
  height_cm: 'height',
  steps: 'steps',
  active_energy_kcal: 'calories',
  resting_energy_kcal: 'basalCalories',
  heart_rate_bpm: 'heartRate',
  resting_heart_rate_bpm: 'restingHeartRate',
  distance_km: 'distance',
  sleep_minutes: 'sleep',
  water_ml: 'dietaryWater',
  energy_intake_kcal: 'dietaryEnergyConsumed',
};

const DATA_TYPE_TO_METRIC: Partial<Record<HealthDataType, HealthMetric>> = Object.fromEntries(
  Object.entries(METRIC_TO_DATA_TYPE).map(([metric, dataType]) => [dataType, metric]),
);

/*
 * Same units, different spelling, except the two this package scales
 * differently: distance in metres against a canonical kilometre and water in
 * litres against a canonical millilitre
 */
const WRITE_SCALE: Partial<Record<HealthMetric, number>> = {
  distance_km: 1000,
  water_ml: 0.001,
};

/* No pagination, a 30 day sync window realistically never hits this */
const READ_LIMIT = 10_000;
const WORKOUT_READ_LIMIT = 1000;

const WORKOUT_METRIC: HealthMetric = 'workout_minutes';

function supportedDataTypes(metrics: HealthMetric[]): HealthDataType[] {
  return metrics
    .map((metric) => METRIC_TO_DATA_TYPE[metric])
    .filter((dataType): dataType is HealthDataType => Boolean(dataType));
}

export const capgoAdapter: NativeHealthPlugin = {
  isAvailable: () => Health.isAvailable(),

  requestPermissions: async ({ read, write }) => {
    const readTypes = supportedDataTypes(read);
    if (read.includes(WORKOUT_METRIC)) readTypes.push('workouts');

    const status = await Health.requestAuthorization({
      read: readTypes,
      write: supportedDataTypes(write),
    });

    const denied = status.readDenied
      .map((dataType) => DATA_TYPE_TO_METRIC[dataType])
      .filter((metric): metric is HealthMetric => Boolean(metric));

    return { granted: status.readAuthorized.length > 0, denied };
  },

  readSamples: async ({ metrics, start, end }) => {
    const records: RawHealthRecord[] = [];

    const plainMetrics = metrics.filter((metric) => metric !== WORKOUT_METRIC);
    await Promise.all(
      plainMetrics.map(async (metric) => {
        const dataType = METRIC_TO_DATA_TYPE[metric];
        if (!dataType) return;

        const { samples } = await Health.readSamples({
          dataType,
          startDate: start,
          endDate: end,
          limit: READ_LIMIT,
        });

        for (const sample of samples) {
          records.push({
            metric,
            value: sample.value,
            unit: sample.unit,
            start_at: sample.startDate,
            end_at: sample.endDate,
            external_id: sample.platformId,
            source: sample.sourceName,
          });
        }
      }),
    );

    if (metrics.includes(WORKOUT_METRIC)) {
      const { workouts } = await Health.queryWorkouts({
        startDate: start,
        endDate: end,
        limit: WORKOUT_READ_LIMIT,
      });

      for (const workout of workouts) {
        records.push({
          metric: WORKOUT_METRIC,
          value: workout.duration / 60,
          unit: 'min',
          start_at: workout.startDate,
          end_at: workout.endDate,
          external_id: workout.platformId,
          source: workout.sourceName,
        });
      }
    }

    return { records };
  },

  writeSamples: async ({ items }) => {
    let written = 0;

    for (const item of items) {
      const dataType = METRIC_TO_DATA_TYPE[item.metric];
      if (!dataType) continue;

      try {
        await Health.saveSample({
          dataType,
          value: item.value * (WRITE_SCALE[item.metric] ?? 1),
          startDate: item.start_at,
          endDate: item.end_at,
        });
        written += 1;
      } catch {
        /* Health Connect refuses some writes, skip it and keep going */
      }
    }

    return { written };
  },

  openHealthSettings: () => Health.openHealthConnectSettings(),
};
