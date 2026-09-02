/* lib/copilot/api.ts */

import { supabase } from '@/lib/supabase';
import type {
  CopilotAttachment,
  CopilotMessage,
  CopilotReply,
  CopilotSurface,
} from './types';
import { DailySummary } from '@/types/nutrition';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

/* Enough for the model to hold a thread without the request growing all
   session. The backend trims again, this just avoids sending the excess */
const MAX_HISTORY = 12;

export interface SendOptions {
  message: string;
  logDate: string;
  surface: CopilotSurface;
  history: CopilotMessage[];
  attachments: CopilotAttachment[];
  liveWorkout?: {
    name: string;
    elapsed_seconds: number;
    exercises: unknown[];
  } | null;
}

async function authHeaders() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    ...(session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` }
      : {}),
  };
}

/* Only role and text travel. Suggestion cards are not replayed, because the
   model does not need to re-read a routine it wrote three turns ago */
function toHistoryTurns(messages: CopilotMessage[]) {
  return messages
    .slice(-MAX_HISTORY)
    .filter((m) => m.message && !m.failed)
    .map((m) => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      text: m.message,
    }));
}

export async function sendCopilotMessage(
  options: SendOptions,
): Promise<CopilotReply> {
  const headers = await authHeaders();

  const res = await fetch(`${BASE_URL}/copilot`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      message: options.message,
      log_date: options.logDate,
      surface: options.surface,
      live_workout: options.liveWorkout ?? null,
      history: toHistoryTurns(options.history),
      attachments: options.attachments.map((a) => ({
        mime_type: a.mimeType,
        data: a.data,
      })),
    }),
  });

  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail?.detail || `Copilot request failed (${res.status})`);
  }

  return res.json();
}

export async function applyProfileAction(
  payload: Record<string, unknown>,
): Promise<void> {
  const headers = await authHeaders();
  const res = await fetch(`${BASE_URL}/profile/me`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to update profile');
}

export async function createRoutine(payload: {
  name: string;
  exercises: unknown[];
}): Promise<{ id: string }> {
  const headers = await authHeaders();
  const res = await fetch(`${BASE_URL}/workouts/templates`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to save routine');
  return res.json();
}

export async function logMealLine(
  line: Record<string, unknown>,
): Promise<void> {
  const headers = await authHeaders();
  const res = await fetch(`${BASE_URL}/meals`, {
    method: 'POST',
    headers,
    body: JSON.stringify(line),
  });
  if (!res.ok) throw new Error('Failed to log meal');
}

export async function fetchExerciseLibrary(): Promise<
  { name: string; type?: string; tracking_fields?: string[] }[]
> {
  const headers = await authHeaders();
  const res = await fetch(`${BASE_URL}/workouts/exercises`, { headers });
  if (!res.ok) return [];
  return res.json();
}
