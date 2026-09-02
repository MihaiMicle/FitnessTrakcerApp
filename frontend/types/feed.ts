/* Mirrors backend/schemas/feed.py */

import type { PublicUserSummary, Visibility } from "@/types/social";

export type FeedEventType = "workout" | "personal_record" | "routine_shared";

/* Which authors a page is drawn from */
export type FeedScope = "following" | "me" | "user";

/* Denormalised on the event, so a card renders without a follow-up request */
export interface WorkoutPayload {
  duration_seconds?: number;
  exercise_count?: number;
  set_count?: number;
  total_reps?: number;
  total_volume_kg?: number;
  total_distance_km?: number;
}

export interface RecordPayload {
  exercise?: string;
  kind?: string;
  weight_kg?: number;
  reps?: number;
  one_rm?: number;
  previous_one_rm?: number;
  improvement_kg?: number;
  session_name?: string;
}

export interface RoutinePayload {
  routine_name?: string;
  exercise_count?: number;
}

export type FeedPayload = WorkoutPayload & RecordPayload & RoutinePayload;

export interface FeedEventItem {
  id: string;
  event_type: FeedEventType;
  visibility: Visibility;
  author: PublicUserSummary;
  subject_type: string | null;
  subject_id: string | null;
  title: string;
  payload: FeedPayload;
  like_count: number;
  comment_count: number;
  liked_by_me: boolean;
  occurred_at: string | null;
}

export interface FeedPage {
  items: FeedEventItem[];
  /* Null on the last page, which is what the client checks rather than
     comparing the item count against the limit */
  next_cursor: string | null;
}

export interface FeedLikeResult {
  event_id: string;
  liked_by_me: boolean;
  like_count: number;
}

export interface FeedCommentItem {
  id: string;
  event_id: string;
  author: PublicUserSummary;
  body: string;
  created_at: string | null;
  /* True for the comment's author and for the owner of the post */
  can_delete: boolean;
}
