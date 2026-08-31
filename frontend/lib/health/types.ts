/* Shapes shared by the bridge, the API client and the settings panel */

import type { HealthMetric } from '@/lib/health/metrics';

export type HealthProvider =
  | 'apple_health'
  | 'health_connect'
  | 'file_import'
  | 'manual';

export type SyncDirection = 'read' | 'write' | 'both';

/* One record as a native plugin hands it over, before any normalization */
export interface RawHealthRecord {
  metric: string;
  value?: number | null;
  unit?: string | null;
  start_at: string | number;
  end_at?: string | number | null;
  external_id?: string | null;
  source?: string | null;
  payload?: Record<string, unknown> | null;
}

/* The same record once it is fit to send */
export interface WireHealthSample {
  metric: HealthMetric;
  value: number;
  unit: string;
  start_at: string;
  end_at: string;
  external_id?: string;
  source?: string;
  payload?: Record<string, unknown>;
}

export interface HealthConnection {
  id: string;
  provider: HealthProvider;
  direction: SyncDirection;
  enabled_metrics: HealthMetric[];
  is_active: boolean;
  device_platform?: string | null;
  device_name?: string | null;
  last_import_at?: string | null;
  last_export_at?: string | null;
  created_at?: string | null;
}

export interface HealthConnectionUpdate {
  provider: HealthProvider;
  direction?: SyncDirection;
  enabled_metrics?: HealthMetric[];
  is_active?: boolean;
  device_platform?: string;
  device_name?: string;
}

export interface SyncResult {
  accepted: number;
  duplicates: number;
  skipped: number;
  applied: Record<string, number>;
  last_import_at?: string | null;
  truncated?: boolean;
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

export interface HealthExportBatch {
  items: HealthExportItem[];
  cursor?: string | null;
}

export interface HealthDailyPoint {
  day: string;
  metric: HealthMetric;
  value: number;
  unit: string;
}

/*
 * What this build can actually do
 *
 * The panel renders from this rather than from a platform check, so adding a
 * provider later is a change to the bridge and not to the UI
 */
export interface HealthCapabilities {
  provider: HealthProvider | null;
  platform: 'ios' | 'android' | 'web';
  /* Whether a health store can be read directly on this device */
  canSync: boolean;
  /* Whether the app can write back into a health store */
  canWrite: boolean;
  /* Whether an exported archive can be uploaded instead */
  canImportFile: boolean;
  /* Why direct sync is unavailable, shown to the user as it is */
  reason?: string;
}
