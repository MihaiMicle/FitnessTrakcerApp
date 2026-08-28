/*
 * The local copy of the workout in progress
 *
 * The queue protects sets that were logged but not yet sent. This protects
 * sets that were logged and then the tab was closed, which is the more common
 * way a phone loses a workout: the browser evicts the page while the user is
 * doing the set, and memory state goes with it
 *
 * On reload there can be two candidates, the local draft and whatever the
 * server calls active. `chooseActiveWorkout` decides between them
 */

import { newSessionId } from '@/lib/offline/ids';

/* A draft older than this is stale rather than resumable */
export const DRAFT_MAX_AGE_MS = 24 * 60 * 60_000;

export interface WorkoutDraft {
  sessionId: string;
  name: string;
  status: string;
  startTime: string;
  durationSeconds: number;
  exercises: unknown[];
  updatedAt: number;
}

export interface DraftInput {
  sessionId: string;
  name: string;
  status?: string;
  startTime: string;
  durationSeconds?: number;
  exercises?: unknown[];
}

export function makeDraft(input: DraftInput, now: number): WorkoutDraft {
  return {
    sessionId: input.sessionId,
    name: input.name,
    status: input.status ?? 'in_progress',
    startTime: input.startTime,
    durationSeconds: input.durationSeconds ?? 0,
    exercises: input.exercises ?? [],
    updatedAt: now,
  };
}

export function isDraft(value: unknown): value is WorkoutDraft {
  if (!value || typeof value !== 'object') return false;
  const draft = value as Record<string, unknown>;
  return (
    typeof draft.sessionId === 'string' &&
    typeof draft.startTime === 'string' &&
    typeof draft.updatedAt === 'number' &&
    Array.isArray(draft.exercises)
  );
}

export function isDraftStale(draft: WorkoutDraft, now: number): boolean {
  return now - draft.updatedAt > DRAFT_MAX_AGE_MS;
}

/* Only a workout still running is worth restoring */
export function isResumable(draft: WorkoutDraft | null, now: number): boolean {
  if (!draft) return false;
  if (draft.status !== 'in_progress') return false;
  return !isDraftStale(draft, now);
}

/* The session shape the workout context expects */
export function draftToSession(draft: WorkoutDraft): Record<string, unknown> {
  return {
    id: draft.sessionId,
    name: draft.name,
    status: draft.status,
    start_time: draft.startTime,
    duration_seconds: draft.durationSeconds,
    exercises: draft.exercises,
  };
}

export interface ServerSession {
  id?: string;
  name?: string;
  status?: string;
  start_time?: string;
  duration_seconds?: number;
  exercises?: unknown[];
}

/*
 * Pick between the local draft and the server's active session
 *
 * When they are the same workout the draft always wins, because it holds the
 * sets that have not reached the server yet. When they are different workouts
 * the more recently started one wins, which is the case where a workout was
 * begun on another device
 */
export function chooseActiveWorkout(
  draft: WorkoutDraft | null,
  server: ServerSession | null,
  now: number,
): Record<string, unknown> | null {
  const usableDraft = isResumable(draft, now) ? draft : null;

  if (!usableDraft) return server ? { ...server } : null;
  if (!server?.id) return draftToSession(usableDraft);
  if (server.id === usableDraft.sessionId) return draftToSession(usableDraft);

  const serverStart = Date.parse(server.start_time ?? '');
  const draftStart = Date.parse(usableDraft.startTime);
  const serverIsNewer =
    Number.isFinite(serverStart) &&
    (!Number.isFinite(draftStart) || serverStart > draftStart);

  return serverIsNewer ? { ...server } : draftToSession(usableDraft);
}

/* A brand new session, ready to log against before the server knows about it */
export function newLocalSession(
  name: string,
  exercises: unknown[],
  now: number,
): Record<string, unknown> {
  return {
    id: newSessionId(),
    name,
    status: 'in_progress',
    start_time: new Date(now).toISOString(),
    duration_seconds: 0,
    exercises,
  };
}
