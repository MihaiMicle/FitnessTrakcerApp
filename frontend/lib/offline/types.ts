/*
 * Shapes for the local-first write queue
 *
 * There are only two operations because the session id is generated on the
 * client, so a save is an upsert and never needs a create to run first
 */

export type SyncOpKind = 'save_session' | 'delete_session';

export interface SyncOperation {
  id: string;
  kind: SyncOpKind;
  /* Workout session id, also the coalescing key */
  entityId: string;
  payload: Record<string, unknown> | null;
  createdAt: number;
  attempts: number;
  /* Epoch ms before which this operation must not be retried */
  nextAttemptAt: number;
  lastError: string | null;
}

export interface SyncQueue {
  version: number;
  operations: SyncOperation[];
  /* Operations that gave up, kept so nothing is silently dropped */
  failed: SyncOperation[];
}

export interface NewOperation {
  kind: SyncOpKind;
  entityId: string;
  payload?: Record<string, unknown> | null;
}

export interface SendResult {
  ok: boolean;
  retryable: boolean;
  error?: string | null;
  status?: number;
}

export type Sender = (op: SyncOperation) => Promise<SendResult>;
