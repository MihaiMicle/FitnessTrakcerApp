/* lib/social/visibility.ts */

/*
 * Client-side mirror of backend/core/social.py
 *
 * The backend is the only thing enforcing access. These helpers exist so the UI
 * can label a visibility picker, disable a share button and render a locked
 * state without a round trip. Never treat a `canView` result here as permission
 * to skip a request the server would have rejected
 */

import type {
  FollowStatus,
  PublicUserSummary,
  RelationshipState,
  Visibility,
} from "@/types/social";

export const VISIBILITY_LEVELS: readonly Visibility[] = [
  "private",
  "followers",
  "public",
] as const;

const VISIBILITY_RANK: Record<Visibility, number> = {
  private: 0,
  followers: 1,
  public: 2,
};

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 30;

const USERNAME_PATTERN = /^[a-z][a-z0-9_]*$/;

/* Kept in sync with RESERVED_USERNAMES in core/social.py */
const RESERVED_USERNAMES = new Set([
  "admin",
  "administrator",
  "api",
  "app",
  "auth",
  "explore",
  "feed",
  "fitnesstracker",
  "help",
  "login",
  "logout",
  "me",
  "moderator",
  "new",
  "profile",
  "root",
  "search",
  "settings",
  "signup",
  "social",
  "staff",
  "support",
  "system",
  "user",
  "users",
  "workouts",
]);

export interface VisibilityOption {
  value: Visibility;
  label: string;
  description: string;
}

export const VISIBILITY_OPTIONS: readonly VisibilityOption[] = [
  {
    value: "private",
    label: "Only me",
    description: "Nobody else can see this",
  },
  {
    value: "followers",
    label: "Followers",
    description: "People who follow you can see this",
  },
  {
    value: "public",
    label: "Everyone",
    description: "Anyone on FitnessTracker can see this",
  },
] as const;

export function isVisibility(value: unknown): value is Visibility {
  return typeof value === "string" && value in VISIBILITY_RANK;
}

/* Unknown values fall back to the closed end of the range */
export function normalizeVisibility(
  value: unknown,
  fallback: Visibility = "private",
): Visibility {
  return isVisibility(value) ? value : fallback;
}

/* A private account never exposes public content */
export function effectiveVisibility(
  visibility: unknown,
  ownerIsPrivate: boolean,
): Visibility {
  const level = normalizeVisibility(visibility);
  if (ownerIsPrivate && VISIBILITY_RANK[level] > VISIBILITY_RANK.followers) {
    return "followers";
  }
  return level;
}

export interface CanViewArgs {
  viewerId: string | null;
  ownerId: string | null;
  visibility: unknown;
  ownerIsPrivate?: boolean;
  isFollower?: boolean;
  isBlocked?: boolean;
}

export function canView({
  viewerId,
  ownerId,
  visibility,
  ownerIsPrivate = false,
  isFollower = false,
  isBlocked = false,
}: CanViewArgs): boolean {
  if (!ownerId) return false;
  if (viewerId && viewerId === ownerId) return true;
  if (isBlocked) return false;

  const level = effectiveVisibility(visibility, ownerIsPrivate);
  if (level === "public") return true;
  if (level === "followers") return Boolean(viewerId) && isFollower;
  return false;
}

/* Whether the viewer may read a user's content, from a summary the API returned */
export function canViewUserContent(user: PublicUserSummary): boolean {
  if (user.relationship === "self") return true;
  if (user.relationship === "blocked") return false;
  if (!user.is_private) return true;
  return user.relationship === "following";
}

export function relationshipFromFollow(
  viewerId: string | null,
  targetId: string,
  followStatus: FollowStatus | null,
  isBlocked = false,
): RelationshipState {
  if (viewerId && viewerId === targetId) return "self";
  if (isBlocked) return "blocked";
  if (followStatus === "accepted") return "following";
  if (followStatus === "pending") return "requested";
  return "none";
}

/* The label a follow button shows for each relationship */
export function followButtonLabel(relationship: RelationshipState): string {
  switch (relationship) {
    case "self":
      return "Edit profile";
    case "following":
      return "Following";
    case "requested":
      return "Requested";
    case "blocked":
      return "Blocked";
    default:
      return "Follow";
  }
}

/* Following a private account creates a request rather than a live follow */
export function willCreateRequest(user: PublicUserSummary): boolean {
  return user.is_private && user.relationship === "none";
}

export function normalizeUsername(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw.trim().replace(/^@+/, "").toLowerCase();
}

export interface UsernameCheck {
  valid: boolean;
  username: string;
  reason: string | null;
}

/* Same rules as validate_username in core/social.py, for inline form feedback */
export function checkUsername(raw: string | null | undefined): UsernameCheck {
  const username = normalizeUsername(raw);

  let reason: string | null = null;
  if (username.length < USERNAME_MIN_LENGTH) {
    reason = `Username must be at least ${USERNAME_MIN_LENGTH} characters`;
  } else if (username.length > USERNAME_MAX_LENGTH) {
    reason = `Username must be at most ${USERNAME_MAX_LENGTH} characters`;
  } else if (!USERNAME_PATTERN.test(username)) {
    reason =
      "Username must start with a letter and use only letters, numbers and underscores";
  } else if (RESERVED_USERNAMES.has(username)) {
    reason = "That username is reserved";
  }

  return { valid: reason === null, username, reason };
}

export function displayName(user: PublicUserSummary): string {
  const full = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
  if (full) return full;
  if (user.username) return `@${user.username}`;
  return "FitnessTracker user";
}
