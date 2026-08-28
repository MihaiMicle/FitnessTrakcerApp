/*
 * The write queue
 *
 * Every mutation to a workout is recorded here first and sent later, so a set
 * logged in a basement with no signal is never lost. Nothing in this file
 * touches the network, storage or React, so all of it is directly testable
 *
 * Two rules do most of the work:
 *
 *   Coalescing   a session only ever has one pending save, carrying the latest
 *                state, so a 90 minute workout produces one request and not one
 *                per checked set
 *   Ordering     operations for the same session run strictly in order, which
 *                is what keeps a delete from overtaking the save before it
 */

import type {
  NewOperation,
  SyncOperation,
  SyncQueue,
} from '@/lib/offline/types';

export const QUEUE_VERSION = 1;

/* Give up after this many tries and move the operation to `failed` */
export const MAX_ATTEMPTS = 8;

export const BASE_BACKOFF_MS = 2_000;
export const MAX_BACKOFF_MS = 5 * 60_000;

export function emptyQueue(): SyncQueue {
  return { version: QUEUE_VERSION, operations: [], failed: [] };
}

/* Doubling delay, capped so a long outage still retries every few minutes */
export function backoffDelay(attempts: number): number {
  if (attempts <= 0) return 0;
  const delay = BASE_BACKOFF_MS * 2 ** (attempts - 1);
  return Math.min(delay, MAX_BACKOFF_MS);
}

function makeId(now: number): string {
  return `op-${now.toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/*
 * Add an operation, folding it into an existing one where possible
 *
 * A save replaces the pending save for the same session in place. The position
 * is kept so the session does not jump the queue, and `attempts` is kept so a
 * session that keeps failing still reaches the cap, but the next attempt is
 * brought forward because new user data is a new intent
 *
 * A delete drops every pending operation for that session first. Sending a
 * save the user has already thrown away is wasted work, and the delete is
 * tolerant of a session the server never heard about
 */
export function enqueue(
  queue: SyncQueue,
  op: NewOperation,
  now: number,
): SyncQueue {
  const fresh: SyncOperation = {
    id: makeId(now),
    kind: op.kind,
    entityId: op.entityId,
    payload: op.payload ?? null,
    createdAt: now,
    attempts: 0,
    nextAttemptAt: now,
    lastError: null,
  };

  if (op.kind === 'delete_session') {
    const others = queue.operations.filter((o) => o.entityId !== op.entityId);
    return { ...queue, operations: [...others, fresh] };
  }

  const existingIndex = queue.operations.findIndex(
    (o) => o.entityId === op.entityId && o.kind === op.kind,
  );

  if (existingIndex === -1) {
    return { ...queue, operations: [...queue.operations, fresh] };
  }

  const existing = queue.operations[existingIndex];
  const merged: SyncOperation = {
    ...existing,
    payload: fresh.payload,
    nextAttemptAt: now,
    lastError: null,
  };
  const operations = [...queue.operations];
  operations[existingIndex] = merged;
  return { ...queue, operations };
}

/*
 * Operations that may be attempted now
 *
 * At most one per session, so a session whose head is still backing off does
 * not let a later operation for that same session run ahead of it. Unrelated
 * sessions are unaffected by each other
 */
export function dueOperations(queue: SyncQueue, now: number): SyncOperation[] {
  const seen = new Set<string>();
  const due: SyncOperation[] = [];

  for (const op of queue.operations) {
    if (seen.has(op.entityId)) continue;
    seen.add(op.entityId);
    if (op.nextAttemptAt <= now) due.push(op);
  }

  return due;
}

export function markSuccess(queue: SyncQueue, opId: string): SyncQueue {
  return {
    ...queue,
    operations: queue.operations.filter((o) => o.id !== opId),
  };
}

/*
 * Record a failed attempt
 *
 * A permanent failure, such as a payload the server rejects, is not worth
 * retrying and goes straight to `failed`. Anything else backs off until the
 * attempt cap, then does the same. Failed operations are kept rather than
 * dropped so the user can be told a workout did not save
 */
export function markFailure(
  queue: SyncQueue,
  opId: string,
  options: { retryable: boolean; error?: string | null; now: number },
): SyncQueue {
  const op = queue.operations.find((o) => o.id === opId);
  if (!op) return queue;

  const attempts = op.attempts + 1;
  const error = options.error ?? null;
  const giveUp = !options.retryable || attempts >= MAX_ATTEMPTS;

  if (giveUp) {
    return {
      ...queue,
      operations: queue.operations.filter((o) => o.id !== opId),
      failed: [...queue.failed, { ...op, attempts, lastError: error }],
    };
  }

  return {
    ...queue,
    operations: queue.operations.map((o) =>
      o.id === opId
        ? {
            ...o,
            attempts,
            lastError: error,
            nextAttemptAt: options.now + backoffDelay(attempts),
          }
        : o,
    ),
  };
}

/* Move dead lettered operations back for a manual retry */
export function retryFailed(queue: SyncQueue, now: number): SyncQueue {
  if (queue.failed.length === 0) return queue;

  const revived = queue.failed.map((op) => ({
    ...op,
    attempts: 0,
    nextAttemptAt: now,
    lastError: null,
  }));

  return {
    ...queue,
    operations: [...queue.operations, ...revived],
    failed: [],
  };
}

export function pendingCount(queue: SyncQueue): number {
  return queue.operations.length;
}

export function failedCount(queue: SyncQueue): number {
  return queue.failed.length;
}

/* True when this session still has unsent work */
export function hasPendingFor(queue: SyncQueue, entityId: string): boolean {
  return queue.operations.some((o) => o.entityId === entityId);
}
