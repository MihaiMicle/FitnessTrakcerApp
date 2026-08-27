/* lib/social/api.ts */

import { supabase } from "@/lib/supabase";
import type {
  FollowRequestItem,
  FollowResult,
  PublicUserProfile,
  PublicUserSummary,
  SocialSettings,
  SocialSettingsUpdate,
  UserSearchResults,
  UsernameAvailability,
  Visibility,
} from "@/types/social";

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
  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed: ${res.status}`);
  }

  /* 204 responses from unfollow, block and reject have no body */
  if (res.status === 204) return undefined as T;
  return res.json();
}

/* Settings */

export function getSocialSettings(): Promise<SocialSettings> {
  return request<SocialSettings>("/social/me/settings");
}

export function updateSocialSettings(
  payload: SocialSettingsUpdate,
): Promise<SocialSettings> {
  return request<SocialSettings>("/social/me/settings", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function checkUsernameAvailable(
  username: string,
): Promise<UsernameAvailability> {
  return request<UsernameAvailability>(
    `/social/username-available?username=${encodeURIComponent(username)}`,
  );
}

/* Discovery */

export function searchUsers(query: string): Promise<UserSearchResults> {
  return request<UserSearchResults>(
    `/social/users/search?q=${encodeURIComponent(query)}`,
  );
}

export function getUserProfile(username: string): Promise<PublicUserProfile> {
  return request<PublicUserProfile>(
    `/social/users/${encodeURIComponent(username)}`,
  );
}

/* Follow graph */

export function followUser(userId: string): Promise<FollowResult> {
  return request<FollowResult>(`/social/follow/${userId}`, { method: "POST" });
}

export function unfollowUser(userId: string): Promise<void> {
  return request<void>(`/social/follow/${userId}`, { method: "DELETE" });
}

export function removeFollower(userId: string): Promise<void> {
  return request<void>(`/social/followers/${userId}`, { method: "DELETE" });
}

export function getFollowers(userId?: string): Promise<PublicUserSummary[]> {
  const query = userId ? `?user_id=${encodeURIComponent(userId)}` : "";
  return request<PublicUserSummary[]>(`/social/followers${query}`);
}

export function getFollowing(userId?: string): Promise<PublicUserSummary[]> {
  const query = userId ? `?user_id=${encodeURIComponent(userId)}` : "";
  return request<PublicUserSummary[]>(`/social/following${query}`);
}

/* Follow requests */

export function getFollowRequests(): Promise<FollowRequestItem[]> {
  return request<FollowRequestItem[]>("/social/requests");
}

export function acceptFollowRequest(userId: string): Promise<FollowResult> {
  return request<FollowResult>(`/social/requests/${userId}/accept`, {
    method: "POST",
  });
}

export function rejectFollowRequest(userId: string): Promise<void> {
  return request<void>(`/social/requests/${userId}/reject`, { method: "POST" });
}

/* Blocking */

export function blockUser(userId: string): Promise<void> {
  return request<void>(`/social/block/${userId}`, { method: "POST" });
}

export function unblockUser(userId: string): Promise<void> {
  return request<void>(`/social/block/${userId}`, { method: "DELETE" });
}

export function getBlockedUsers(): Promise<PublicUserSummary[]> {
  return request<PublicUserSummary[]>("/social/blocks");
}

/* Shared content */

export function getUserSessions(userId: string): Promise<unknown[]> {
  return request<unknown[]>(`/workouts/users/${userId}/sessions`);
}

export function getUserTemplates(userId: string): Promise<unknown[]> {
  return request<unknown[]>(`/workouts/users/${userId}/templates`);
}

export function copyTemplate(templateId: string): Promise<unknown> {
  return request<unknown>(`/workouts/templates/${templateId}/copy`, {
    method: "POST",
  });
}

export function setSessionVisibility(
  sessionId: string,
  visibility: Visibility,
): Promise<unknown> {
  return request<unknown>(`/workouts/${sessionId}`, {
    method: "PUT",
    body: JSON.stringify({ visibility }),
  });
}
