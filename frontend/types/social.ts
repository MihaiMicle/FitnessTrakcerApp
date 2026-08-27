/* Mirrors backend/schemas/social.py */

export type Visibility = "private" | "followers" | "public";

export type FollowStatus = "pending" | "accepted";

export type RelationshipState =
  | "self"
  | "none"
  | "requested"
  | "following"
  | "blocked";

export interface PublicUserSummary {
  id: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  is_private: boolean;
  relationship: RelationshipState;
}

export interface PublicUserProfile extends PublicUserSummary {
  bio: string | null;
  followers_count: number;
  following_count: number;
  /* False when the account is private and the viewer is not an accepted follower */
  can_view_content: boolean;
}

export interface SocialSettings {
  username: string | null;
  bio: string | null;
  is_private: boolean;
  default_workout_visibility: Visibility;
  default_routine_visibility: Visibility;
  followers_count: number;
  following_count: number;
  pending_requests_count: number;
}

export interface SocialSettingsUpdate {
  username?: string;
  bio?: string;
  is_private?: boolean;
  default_workout_visibility?: Visibility;
  default_routine_visibility?: Visibility;
}

export interface FollowResult {
  following_id: string;
  status: FollowStatus;
  relationship: RelationshipState;
}

export interface FollowRequestItem {
  follow_id: string;
  user: PublicUserSummary;
  created_at: string | null;
}

export interface UsernameAvailability {
  username: string;
  available: boolean;
  reason: string | null;
}

export interface UserSearchResults {
  query: string;
  results: PublicUserSummary[];
}
