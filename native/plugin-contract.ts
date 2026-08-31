/*
 * The contract the native plugin has to satisfy
 *
 * Copy this into the plugin package when you scaffold it. The web app looks
 * the plugin up at runtime under the name FitnessTrackerHealth, so nothing
 * above lib/health/bridge.ts imports any of it and the web build stays free
 * of Capacitor entirely
 *
 * Every method maps onto both platforms without a per-platform branch above
 * this line. Where the two stores genuinely differ, the difference is
 * absorbed here and reported through `isAvailable`
 */

export type HealthMetric =
  | 'weight_kg'
  | 'body_fat_percent'
  | 'height_cm'
  | 'steps'
  | 'active_energy_kcal'
  | 'resting_energy_kcal'
  | 'heart_rate_bpm'
  | 'resting_heart_rate_bpm'
  | 'distance_km'
  | 'sleep_minutes'
  | 'water_ml'
  | 'energy_intake_kcal'
  | 'protein_g'
  | 'carbs_g'
  | 'fat_g'
  | 'workout_minutes';

export interface HealthRecord {
  /* Either a canonical metric or the platform's own identifier, both are mapped */
  metric: string;
  value: number;
  unit: string;
  start_at: string;
  end_at?: string;
  /*
   * The store's own record id: HKObject.uuid on iOS, Record.metadata.id on
   * Android. Sending it is what makes a repeated read cheap rather than
   * duplicated, so send it whenever the platform gives you one
   */
  external_id?: string;
  /*
   * The app that wrote the record. Used to skip our own writes, so it must be
   * the source's display name and not the bundle id
   */
  source?: string;
  payload?: Record<string, unknown>;
}

export interface HealthExportItem {
  export_key: string;
  metric: HealthMetric;
  value: number;
  unit: string;
  start_at: string;
  end_at: string;
  payload?: Record<string, unknown> | null;
}

export interface FitnessTrackerHealthPlugin {
  /*
   * Whether this device can sync at all
   *
   * On iOS this is HKHealthStore.isHealthDataAvailable(), false on iPad
   * without Health. On Android it is the Health Connect availability check,
   * which returns not-installed on 9 to 13 when the user has not added it.
   * Return the reason as text the user can act on, it is shown verbatim
   */
  isAvailable(): Promise<{ available: boolean; reason?: string }>;

  /*
   * Ask the system for permission
   *
   * iOS never reports read permission, by design: HealthKit refuses to reveal
   * whether a user denied a read because that itself leaks health information.
   * Return granted true on iOS once the sheet has been shown and let an empty
   * read speak for itself
   */
  requestPermissions(options: {
    read: HealthMetric[];
    write: HealthMetric[];
  }): Promise<{ granted: boolean; denied?: HealthMetric[] }>;

  /*
   * Read a window
   *
   * Health Connect only exposes the thirty days before permission was granted
   * however far back you ask, so do not treat a short answer as an error.
   * HealthKit has no such limit
   *
   * Filter out records whose source is this app before returning them. The
   * server drops them too, but doing it here saves the round trip
   */
  readSamples(options: {
    metrics: HealthMetric[];
    start: string;
    end: string;
  }): Promise<{ records: HealthRecord[] }>;

  /*
   * Write the app's own data into the store
   *
   * Keep the export_key values you have already written and skip them, so a
   * repeated export does not create a second copy of the same workout. Write
   * under the source name FitnessTracker so the read path recognises them
   */
  writeSamples(options: {
    items: HealthExportItem[];
  }): Promise<{ written: number }>;

  /* Deep link into the system health settings, for a denied permission */
  openHealthSettings?(): Promise<void>;
}
