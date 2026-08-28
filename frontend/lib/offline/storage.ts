/*
 * Local persistence
 *
 * Everything here fails soft. Server rendering has no `localStorage`, Safari
 * private mode throws on write, and a full disk throws on quota. None of those
 * should take down a workout, so a failed read falls back and a failed write
 * returns false
 *
 * Stored values are validated on read because a half written or outdated blob
 * is otherwise handed to the app as if it were a queue
 */

import { emptyQueue, QUEUE_VERSION } from '@/lib/offline/queue';
import type { SyncOperation, SyncQueue } from '@/lib/offline/types';

export const QUEUE_KEY = 'fittracker.sync.queue.v1';
export const DRAFT_KEY = 'fittracker.workout.draft.v1';
export const PREV_SETS_KEY = 'fittracker.workout.prevSets.v1';

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function getStorage(): StorageLike | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage ?? null;
  } catch {
    return null;
  }
}

export function readJson<T>(key: string, fallback: T): T {
  const storage = getStorage();
  if (!storage) return fallback;
  try {
    const raw = storage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown): boolean {
  const storage = getStorage();
  if (!storage) return false;
  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeKey(key: string): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(key);
  } catch {
    /* nothing useful to do if the key cannot be removed */
  }
}

function isOperation(value: unknown): value is SyncOperation {
  if (!value || typeof value !== 'object') return false;
  const op = value as Record<string, unknown>;
  return (
    typeof op.id === 'string' &&
    typeof op.entityId === 'string' &&
    (op.kind === 'save_session' || op.kind === 'delete_session') &&
    typeof op.attempts === 'number' &&
    typeof op.nextAttemptAt === 'number'
  );
}

/*
 * Accept a stored queue only if it is the current version and every operation
 * looks intact, dropping the individual ones that do not
 */
export function parseQueue(value: unknown): SyncQueue {
  if (!value || typeof value !== 'object') return emptyQueue();
  const raw = value as Record<string, unknown>;
  if (raw.version !== QUEUE_VERSION) return emptyQueue();

  const operations = Array.isArray(raw.operations)
    ? raw.operations.filter(isOperation)
    : [];
  const failed = Array.isArray(raw.failed)
    ? raw.failed.filter(isOperation)
    : [];

  return { version: QUEUE_VERSION, operations, failed };
}

export function loadQueue(): SyncQueue {
  return parseQueue(readJson<unknown>(QUEUE_KEY, null));
}

export function saveQueue(queue: SyncQueue): boolean {
  return writeJson(QUEUE_KEY, queue);
}
