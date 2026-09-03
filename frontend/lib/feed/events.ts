/* lib/feed/events.ts */

/*
 * Client-side mirror of backend/core/feed.py
 *
 * Formatting only. The server decides what becomes an event and who may read
 * it; these helpers turn a payload into the strings a card shows, and hold the
 * optimistic like arithmetic so the button can settle without a round trip
 */

import type {
  FeedCommentItem,
  FeedEventItem,
  FeedEventType,
  FeedPayload,
} from '@/types/feed';
import { displayName } from '@/lib/social/visibility';

export const COMMENT_MAX_LENGTH = 500;

const EVENT_TYPES: readonly FeedEventType[] = [
  'workout',
  'personal_record',
  'routine_shared',
  'meal_shared',
  'recipe_shared',
  'diary_shared',
] as const;

export function isFeedEventType(value: unknown): value is FeedEventType {
  return (
    typeof value === 'string' && EVENT_TYPES.includes(value as FeedEventType)
  );
}

/* Unknown types render as a plain workout rather than an empty card */
export function normalizeEventType(value: unknown): FeedEventType {
  return isFeedEventType(value) ? value : 'workout';
}

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/* Trailing zeroes make a lift look like a spec sheet rather than a number */
export function formatWeight(value: unknown): string {
  const kg = toNumber(value);
  const rounded = Math.round(kg * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)} kg`;
}

export function formatVolume(value: unknown): string {
  return `${Math.round(toNumber(value)).toLocaleString()} kg`;
}

/* Under an hour reads better as minutes alone than as 0h 42m */
export function formatDuration(seconds: unknown): string {
  const total = Math.max(0, Math.round(toNumber(seconds)));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return '< 1m';
}

/* Relative until it stops being useful, then an absolute date */
export function formatWhen(
  timestamp: string | null | undefined,
  now: number = Date.now(),
): string {
  if (!timestamp) return '';

  const moment = new Date(timestamp).getTime();
  if (Number.isNaN(moment)) return '';

  const seconds = Math.round((now - moment) / 1000);
  if (seconds < 60) return 'just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return new Date(moment).toLocaleDateString();
}

/* The short stats line under a card's headline */
export function summaryLine(
  eventType: FeedEventType,
  payload: FeedPayload | null | undefined,
): string {
  const data = payload ?? {};

  if (normalizeEventType(eventType) === 'personal_record') {
    const parts = [`${formatWeight(data.weight_kg)} x ${toNumber(data.reps)}`];
    if (toNumber(data.improvement_kg) > 0) {
      parts.push(`+${formatWeight(data.improvement_kg)} est. 1RM`);
    }
    return parts.join(' • ');
  }

  if (normalizeEventType(eventType) === 'routine_shared') {
    const count = toNumber(data.exercise_count);
    return `${count} ${count === 1 ? 'exercise' : 'exercises'}`;
  }

  if (
    ['meal_shared', 'recipe_shared', 'diary_shared'].includes(
      normalizeEventType(eventType),
    )
  ) {
    const cals = Math.round(toNumber(data.calories));
    const p = Math.round(toNumber(data.protein_g));
    const c = Math.round(toNumber(data.carbs_g));
    const f = Math.round(toNumber(data.fats_g));
    return `${cals} kcal | P: ${p}g | C: ${c}g | F: ${f}g`;
  }

  const parts: string[] = [];
  const exercises = toNumber(data.exercise_count);
  const sets = toNumber(data.set_count);

  if (exercises > 0) {
    parts.push(`${exercises} ${exercises === 1 ? 'exercise' : 'exercises'}`);
  }
  if (sets > 0) parts.push(`${sets} ${sets === 1 ? 'set' : 'sets'}`);
  if (toNumber(data.total_volume_kg) > 0) {
    parts.push(formatVolume(data.total_volume_kg));
  }
  if (toNumber(data.total_distance_km) > 0) {
    parts.push(`${toNumber(data.total_distance_km)} km`);
  }
  if (toNumber(data.duration_seconds) > 0) {
    parts.push(formatDuration(data.duration_seconds));
  }

  return parts.join(' • ');
}

/* The sentence above the headline, naming who did the thing */
export function actorLine(event: FeedEventItem): string {
  const who = displayName(event.author);

  switch (normalizeEventType(event.event_type)) {
    case 'personal_record':
      return `${who} hit a personal record`;
    case 'routine_shared':
      return `${who} shared a routine`;
    case 'meal_shared':
      return `${who} shared a meal`;
    case 'recipe_shared':
      return `${who} shared a recipe`;
    case 'diary_shared':
      return `${who} completed their diary`;
    default:
      return `${who} finished a workout`;
  }
}

export function likeLabel(count: number): string {
  const total = Math.max(0, Math.round(toNumber(count)));
  return `${total} ${total === 1 ? 'like' : 'likes'}`;
}

export function commentLabel(count: number): string {
  const total = Math.max(0, Math.round(toNumber(count)));
  return `${total} ${total === 1 ? 'comment' : 'comments'}`;
}

/*
 * The state a like button should show before the server answers
 *
 * Clamped at zero because a stale count plus a fast double tap would otherwise
 * render as -1 likes
 */
export function toggleLike(event: FeedEventItem): FeedEventItem {
  const liked = !event.liked_by_me;
  const delta = liked ? 1 : -1;

  return {
    ...event,
    liked_by_me: liked,
    like_count: Math.max(0, toNumber(event.like_count) + delta),
  };
}

/* Replace one event in a loaded page, leaving the rest untouched */
export function replaceEvent(
  events: FeedEventItem[],
  updated: FeedEventItem,
): FeedEventItem[] {
  return events.map((event) => (event.id === updated.id ? updated : event));
}

/*
 * Append a page, dropping ids that are already loaded
 *
 * Keyset pagination should not repeat a row, but a workout finished between
 * two page loads can still land on a boundary. Deduping here is cheaper than
 * letting React render two cards with the same key
 */
export function appendPage(
  existing: FeedEventItem[],
  incoming: FeedEventItem[],
): FeedEventItem[] {
  const seen = new Set(existing.map((event) => event.id));
  return [...existing, ...incoming.filter((event) => !seen.has(event.id))];
}

export interface CommentCheck {
  valid: boolean;
  body: string;
  reason: string | null;
}

/* Same rules as normalize_comment in core/feed.py, for inline form feedback */
export function checkComment(raw: string | null | undefined): CommentCheck {
  const body = (raw ?? '').trim();

  let reason: string | null = null;
  if (!body) {
    reason = 'Comment cannot be empty';
  } else if (body.length > COMMENT_MAX_LENGTH) {
    reason = `Comment must be at most ${COMMENT_MAX_LENGTH} characters`;
  }

  return { valid: reason === null, body, reason };
}

/* Drop a deleted comment and report the count the card should now show */
export function removeComment(
  comments: FeedCommentItem[],
  commentId: string,
): FeedCommentItem[] {
  return comments.filter((comment) => comment.id !== commentId);
}
