/*
 * The one place that knows whether this build can reach a health store
 *
 * Neither HealthKit nor Health Connect has a web API, and the Google Fit REST
 * API stopped taking new developers in May 2024 and is being retired, so a
 * browser cannot talk to any of them. A packaged build can, through a native
 * plugin. That difference is contained here so nothing above it branches on
 * the platform
 *
 * The plugin is looked up on `window` rather than imported. A static import
 * of a Capacitor plugin would have to resolve in the web build too, and the
 * whole point is that the web build does not have one
 *
 * See native/README.md for the contract and how to register it
 */

import {
  getConnections,
  postExportAck,
  postSync,
  fetchExport,
} from '@/lib/health/api';
import { chunkBatch, latestInstant, toWireBatch } from '@/lib/health/normalize';
import { describeResult, mergeResults, resolveReadWindow } from '@/lib/health/sync';
import type { HealthMetric } from '@/lib/health/metrics';
import type {
  HealthCapabilities,
  HealthExportItem,
  HealthProvider,
  RawHealthRecord,
  SyncResult,
} from '@/lib/health/types';

export interface NativeHealthPlugin {
  isAvailable(): Promise<{ available: boolean; reason?: string }>;
  requestPermissions(options: {
    read: HealthMetric[];
    write: HealthMetric[];
  }): Promise<{ granted: boolean; denied?: HealthMetric[] }>;
  readSamples(options: {
    metrics: HealthMetric[];
    start: string;
    end: string;
  }): Promise<{ records: RawHealthRecord[] }>;
  writeSamples(options: {
    items: HealthExportItem[];
  }): Promise<{ written: number }>;
  openHealthSettings?(): Promise<void>;
}

interface CapacitorGlobal {
  getPlatform?: () => string;
  isNativePlatform?: () => boolean;
  Plugins?: Record<string, unknown>;
}

declare global {
  interface Window {
    FitnessTrackerHealth?: NativeHealthPlugin;
    Capacitor?: CapacitorGlobal;
  }
}

export function getPlatform(): 'ios' | 'android' | 'web' {
  if (typeof window === 'undefined') return 'web';
  const platform = window.Capacitor?.getPlatform?.();
  if (platform === 'ios' || platform === 'android') return platform;
  return 'web';
}

/*
 * Capacitor publishes a registered plugin under its own name, so a plugin
 * called FitnessTrackerHealth needs no wiring in the web code at all. The
 * explicit global is the fallback for a shell that is not Capacitor
 */
export function getPlugin(): NativeHealthPlugin | null {
  if (typeof window === 'undefined') return null;
  const registered = window.Capacitor?.Plugins?.FitnessTrackerHealth;
  return (registered as NativeHealthPlugin) ?? window.FitnessTrackerHealth ?? null;
}

/* Which store a platform talks to, which is also its provider name */
export function providerForPlatform(
  platform: 'ios' | 'android' | 'web',
): HealthProvider | null {
  if (platform === 'ios') return 'apple_health';
  if (platform === 'android') return 'health_connect';
  return null;
}

const WEB_REASON =
  'Apple Health and Health Connect only exist on the device, so a browser ' +
  'cannot read them. Upload an export instead, or install the app';

const MISSING_PLUGIN_REASON =
  'This build has no health plugin. Rebuild the native shell to enable ' +
  'direct sync';

/*
 * What this build can do
 *
 * Resolved once per call rather than cached, because a permission the user
 * granted in the system settings while the app was open changes the answer
 */
export async function getCapabilities(): Promise<HealthCapabilities> {
  const platform = getPlatform();
  const provider = providerForPlatform(platform);

  if (platform === 'web' || provider === null) {
    return {
      provider: 'file_import',
      platform: 'web',
      canSync: false,
      canWrite: false,
      canImportFile: true,
      reason: WEB_REASON,
    };
  }

  const plugin = getPlugin();
  if (!plugin) {
    return {
      provider,
      platform,
      canSync: false,
      canWrite: false,
      canImportFile: true,
      reason: MISSING_PLUGIN_REASON,
    };
  }

  try {
    const { available, reason } = await plugin.isAvailable();
    return {
      provider,
      platform,
      canSync: available,
      canWrite: available,
      /* An Android user can still upload an iPhone export from a shared file */
      canImportFile: true,
      reason: available ? undefined : reason,
    };
  } catch {
    return {
      provider,
      platform,
      canSync: false,
      canWrite: false,
      canImportFile: true,
      reason: 'The health plugin did not respond',
    };
  }
}

export async function requestPermissions(
  read: HealthMetric[],
  write: HealthMetric[],
): Promise<boolean> {
  const plugin = getPlugin();
  if (!plugin) return false;
  try {
    const { granted } = await plugin.requestPermissions({ read, write });
    return granted;
  } catch {
    return false;
  }
}

export interface SyncOutcome {
  result: SyncResult;
  summary: string;
  read: number;
}

/*
 * Pull from the health store and hand it to the server
 *
 * Chunked because a first read can return years of history at once, and each
 * chunk is a complete request: an interrupted sync leaves the chunks that
 * landed stored, and the next run re-reads the overlap and finds them already
 * there rather than duplicating them
 */
export async function pullFromDevice(
  provider: HealthProvider,
  metrics: HealthMetric[],
  lastImportAt?: string | null,
): Promise<SyncOutcome> {
  const plugin = getPlugin();
  if (!plugin) throw new Error(MISSING_PLUGIN_REASON);

  const window = resolveReadWindow(lastImportAt);
  const { records } = await plugin.readSamples({
    metrics,
    start: window.start,
    end: window.end,
  });

  const { samples, skipped } = toWireBatch(records, provider, metrics);
  if (!samples.length) {
    const empty = { accepted: 0, duplicates: 0, skipped, applied: {} };
    return { result: empty, summary: describeResult(empty, samples), read: 0 };
  }

  const syncedThrough = latestInstant(samples) ?? window.end;
  const results: SyncResult[] = [];
  for (const chunk of chunkBatch(samples)) {
    results.push(await postSync({ provider, samples: chunk, synced_through: syncedThrough }));
  }

  const merged = mergeResults(results);
  merged.skipped += skipped;
  return { result: merged, summary: describeResult(merged, samples), read: samples.length };
}

/*
 * Write the app's own data into the health store
 *
 * The cursor only moves after the device confirms the write, so an app killed
 * halfway through asks for the same window again rather than losing the batch
 */
export async function pushToDevice(
  provider: HealthProvider,
): Promise<{ written: number }> {
  const plugin = getPlugin();
  if (!plugin) throw new Error(MISSING_PLUGIN_REASON);

  const batch = await fetchExport(provider);
  if (!batch.items.length) return { written: 0 };

  const { written } = await plugin.writeSamples({ items: batch.items });

  if (written > 0 && batch.cursor) {
    await postExportAck({ provider, written_through: batch.cursor });
  }

  return { written };
}

/* One button: pull, then push, using whatever the account has consented to */
export async function runFullSync(): Promise<{
  pulled: SyncOutcome | null;
  pushed: number;
}> {
  const capabilities = await getCapabilities();
  if (!capabilities.canSync || !capabilities.provider) {
    throw new Error(capabilities.reason ?? 'Sync is not available on this device');
  }

  const provider = capabilities.provider;
  const connection = (await getConnections()).find((c) => c.provider === provider);

  const metrics = connection?.enabled_metrics ?? [];
  const direction = connection?.direction ?? 'read';

  let pulled: SyncOutcome | null = null;
  if (direction === 'read' || direction === 'both') {
    pulled = await pullFromDevice(provider, metrics, connection?.last_import_at);
  }

  let pushed = 0;
  if (direction === 'write' || direction === 'both') {
    pushed = (await pushToDevice(provider)).written;
  }

  return { pulled, pushed };
}
