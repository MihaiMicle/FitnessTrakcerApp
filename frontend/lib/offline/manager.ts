/*
 * The queue's connection to the browser
 *
 * One instance per tab. Holds the queue in memory, mirrors it to local storage
 * on every change, and decides when to drain: on a new write, when the network
 * returns, when the tab is looked at again, and when a backoff expires
 *
 * All the decisions live in `queue.ts` and `sync.ts`. This file only supplies
 * the clock, the storage and the events
 */

import {
  emptyQueue,
  enqueue,
  failedCount,
  hasPendingFor,
  pendingCount,
  retryFailed,
} from '@/lib/offline/queue';
import { loadQueue, saveQueue } from '@/lib/offline/storage';
import { runSync } from '@/lib/offline/sync';
import { sendWorkoutOperation } from '@/lib/offline/workoutSender';
import type { NewOperation, SyncQueue } from '@/lib/offline/types';

export interface SyncStatus {
  pending: number;
  failed: number;
  syncing: boolean;
  online: boolean;
}

/* Catches anything the events missed, such as a flaky connection that never
 * fired an offline event */
const POLL_INTERVAL_MS = 20_000;

let queue: SyncQueue | null = null;
let loaded = false;
let syncing = false;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let started = false;

const listeners = new Set<(status: SyncStatus) => void>();

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

export function isOnline(): boolean {
  if (!isBrowser()) return true;
  return navigator.onLine !== false;
}

function current(): SyncQueue {
  if (!loaded) {
    queue = isBrowser() ? loadQueue() : emptyQueue();
    loaded = true;
  }
  return queue ?? emptyQueue();
}

export function getStatus(): SyncStatus {
  const q = current();
  return {
    pending: pendingCount(q),
    failed: failedCount(q),
    syncing,
    online: isOnline(),
  };
}

function emit(): void {
  const status = getStatus();
  listeners.forEach((listener) => listener(status));
}

function commit(next: SyncQueue): void {
  queue = next;
  loaded = true;
  if (isBrowser()) saveQueue(next);
  emit();
}

export function subscribe(listener: (status: SyncStatus) => void): () => void {
  listeners.add(listener);
  listener(getStatus());
  return () => {
    listeners.delete(listener);
  };
}

/* Wake up exactly when the earliest backing off operation becomes due */
function scheduleRetry(): void {
  if (!isBrowser()) return;
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }

  const q = current();
  if (q.operations.length === 0) return;

  const soonest = Math.min(...q.operations.map((o) => o.nextAttemptAt));
  const delay = Math.max(250, soonest - Date.now());
  retryTimer = setTimeout(() => {
    retryTimer = null;
    void flush();
  }, delay);
}

export async function flush(): Promise<void> {
  if (!isBrowser() || syncing) return;

  const q = current();
  if (q.operations.length === 0) return;
  if (!isOnline()) return;

  syncing = true;
  emit();

  try {
    const report = await runSync(q, sendWorkoutOperation, {
      now: () => Date.now(),
    });
    commit(report.queue);
  } finally {
    syncing = false;
    emit();
    scheduleRetry();
  }
}

export function queueOperation(op: NewOperation): void {
  commit(enqueue(current(), op, Date.now()));
  void flush();
}

export function queueSessionSave(
  sessionId: string,
  payload: Record<string, unknown>,
): void {
  queueOperation({ kind: 'save_session', entityId: sessionId, payload });
}

export function queueSessionDelete(sessionId: string): void {
  queueOperation({
    kind: 'delete_session',
    entityId: sessionId,
    payload: null,
  });
}

export function retryFailedOperations(): void {
  commit(retryFailed(current(), Date.now()));
  void flush();
}

export function hasUnsyncedWork(sessionId: string): boolean {
  return hasPendingFor(current(), sessionId);
}

/* Called once from the workout provider */
export function startSyncManager(): () => void {
  if (!isBrowser() || started) return () => {};
  started = true;

  const onOnline = () => {
    emit();
    void flush();
  };
  const onOffline = () => emit();
  const onVisible = () => {
    if (document.visibilityState === 'visible') void flush();
  };

  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);
  document.addEventListener('visibilitychange', onVisible);
  pollTimer = setInterval(() => void flush(), POLL_INTERVAL_MS);

  void flush();

  return () => {
    started = false;
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
    document.removeEventListener('visibilitychange', onVisible);
    if (pollTimer) clearInterval(pollTimer);
    if (retryTimer) clearTimeout(retryTimer);
    pollTimer = null;
    retryTimer = null;
  };
}
