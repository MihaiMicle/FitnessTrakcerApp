/*
 * Deciding what to ask a health store for
 *
 * Split out from bridge.ts for the same reason lib/offline/sync.ts is split
 * from manager.ts: none of this touches a plugin, a network or a clock it did
 * not receive, so all of it can be tested directly
 */

import type { SyncResult, WireHealthSample } from '@/lib/health/types';

/*
 * Health Connect only exposes the thirty days before permission was granted,
 * so a first read on Android cannot reach further back however it is asked.
 * HealthKit has no such limit, but thirty days is a sensible first window
 * there too and the user can pull more once they see it working
 */
export const FIRST_READ_DAYS = 30;

/*
 * Re-read a little before the cursor on every sync
 *
 * A watch that syncs to the phone late writes a sample with yesterday's
 * timestamp today. Reading strictly forward from the cursor would miss it
 * forever. Overlapping costs nothing because every sample carries an id and a
 * repeat is recognised on the way in
 */
export const OVERLAP_MINUTES = 90;

const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;

export interface ReadWindow {
  start: string;
  end: string;
}

/* The window to ask for, given where the last sync got to */
export function resolveReadWindow(
  lastImportAt: string | null | undefined,
  now: number = Date.now(),
): ReadWindow {
  const end = new Date(now).toISOString();

  const cursor = lastImportAt ? Date.parse(lastImportAt) : NaN;
  if (Number.isNaN(cursor)) {
    return { start: new Date(now - FIRST_READ_DAYS * DAY_MS).toISOString(), end };
  }

  /* A cursor from the future is a clock that moved, so fall back to a full read */
  if (cursor > now) {
    return { start: new Date(now - FIRST_READ_DAYS * DAY_MS).toISOString(), end };
  }

  return { start: new Date(cursor - OVERLAP_MINUTES * MINUTE_MS).toISOString(), end };
}

export function emptyResult(): SyncResult {
  return { accepted: 0, duplicates: 0, skipped: 0, applied: {} };
}

/*
 * Fold the responses from a chunked sync into one
 *
 * The panel reports a single number to the user, so the split into requests
 * has to be invisible above this line
 */
export function mergeResults(results: SyncResult[]): SyncResult {
  const merged = emptyResult();

  for (const result of results) {
    merged.accepted += result.accepted ?? 0;
    merged.duplicates += result.duplicates ?? 0;
    merged.skipped += result.skipped ?? 0;
    merged.truncated = merged.truncated || result.truncated || undefined;

    for (const [metric, count] of Object.entries(result.applied ?? {})) {
      merged.applied[metric] = (merged.applied[metric] ?? 0) + count;
    }

    const cursor = result.last_import_at;
    if (cursor && (!merged.last_import_at || cursor > merged.last_import_at)) {
      merged.last_import_at = cursor;
    }
  }

  return merged;
}

/* A one line summary of a sync, for the panel */
export function describeResult(result: SyncResult, samples: WireHealthSample[]): string {
  if (!samples.length) return 'Already up to date';

  const parts = [`${result.accepted} new`];
  if (result.duplicates) parts.push(`${result.duplicates} already had`);
  if (result.skipped) parts.push(`${result.skipped} skipped`);

  const applied = Object.values(result.applied ?? {}).reduce((a, b) => a + b, 0);
  if (applied) parts.push(`${applied} added to your log`);

  return parts.join(', ');
}
