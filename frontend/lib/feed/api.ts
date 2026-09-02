/* lib/feed/api.ts */

import { supabase } from "@/lib/supabase";
import type {
  FeedCommentItem,
  FeedLikeResult,
  FeedPage,
  FeedScope,
} from "@/types/feed";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

async function getAuthHeaders() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return {
    "Content-Type": "application/json",
    ...(session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` }
      : {}),
  };
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = await getAuthHeaders();

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, { ...init, headers });
  } catch {
    /*
     * fetch only rejects when the response never arrived, so this is not an
     * API error. It is the server being down, the wrong NEXT_PUBLIC_API_URL,
     * or a 500 whose CORS headers were stripped on the way out. Naming the URL
     * is the difference between a dead end and a one line fix
     */
    throw new Error(`Could not reach the API at ${BASE_URL}`);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed: ${res.status}`);
  }

  /* 204 responses from comment deletion have no body */
  if (res.status === 204) return undefined as T;
  return res.json();
}

export interface FeedQuery {
  scope?: FeedScope;
  userId?: string;
  cursor?: string | null;
  limit?: number;
}

export function getFeed({
  scope = "following",
  userId,
  cursor,
  limit,
}: FeedQuery = {}): Promise<FeedPage> {
  const params = new URLSearchParams({ scope });
  if (userId) params.set("user_id", userId);
  if (cursor) params.set("cursor", cursor);
  if (limit) params.set("limit", String(limit));

  return request<FeedPage>(`/social/feed?${params.toString()}`);
}

export function likeEvent(eventId: string): Promise<FeedLikeResult> {
  return request<FeedLikeResult>(`/social/feed/${eventId}/like`, {
    method: "POST",
  });
}

export function unlikeEvent(eventId: string): Promise<FeedLikeResult> {
  return request<FeedLikeResult>(`/social/feed/${eventId}/like`, {
    method: "DELETE",
  });
}

export function getComments(eventId: string): Promise<FeedCommentItem[]> {
  return request<FeedCommentItem[]>(`/social/feed/${eventId}/comments`);
}

export function postComment(
  eventId: string,
  body: string,
): Promise<FeedCommentItem> {
  return request<FeedCommentItem>(`/social/feed/${eventId}/comments`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
}

export function deleteComment(commentId: string): Promise<void> {
  return request<void>(`/social/feed/comments/${commentId}`, {
    method: "DELETE",
  });
}
