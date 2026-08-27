import { describe, expect, it } from "vitest";

import {
  VISIBILITY_LEVELS,
  canView,
  canViewUserContent,
  checkUsername,
  displayName,
  effectiveVisibility,
  followButtonLabel,
  normalizeUsername,
  normalizeVisibility,
  relationshipFromFollow,
  willCreateRequest,
} from "@/lib/social/visibility";
import type {
  PublicUserSummary,
  RelationshipState,
  Visibility,
} from "@/types/social";

/*
 * These mirror backend/tests/test_social.py case for case. When the two drift,
 * the UI starts rendering a share button the API will reject, or hiding content
 * the API would have served
 */

const OWNER = "owner-uuid";
const VIEWER = "viewer-uuid";

const view = (overrides: Partial<Parameters<typeof canView>[0]> = {}) =>
  canView({
    viewerId: VIEWER,
    ownerId: OWNER,
    visibility: "public",
    ownerIsPrivate: false,
    isFollower: false,
    isBlocked: false,
    ...overrides,
  });

const user = (overrides: Partial<PublicUserSummary> = {}): PublicUserSummary => ({
  id: OWNER,
  username: "tudor",
  first_name: null,
  last_name: null,
  avatar_url: null,
  is_private: false,
  relationship: "none",
  ...overrides,
});

describe("normalizeVisibility", () => {
  it("falls back to private for anything unrecognised", () => {
    /* A row written before this feature must not read as public */
    expect(normalizeVisibility(undefined)).toBe("private");
    expect(normalizeVisibility(null)).toBe("private");
    expect(normalizeVisibility("")).toBe("private");
    expect(normalizeVisibility("friends-only")).toBe("private");
    expect(normalizeVisibility(2)).toBe("private");
  });

  it("passes known levels through", () => {
    for (const level of VISIBILITY_LEVELS) {
      expect(normalizeVisibility(level)).toBe(level);
    }
  });

  it("honours an explicit fallback", () => {
    expect(normalizeVisibility("nonsense", "followers")).toBe("followers");
  });
});

describe("effectiveVisibility", () => {
  it("clamps public down to followers for a private account", () => {
    expect(effectiveVisibility("public", true)).toBe("followers");
  });

  it("never loosens a level", () => {
    expect(effectiveVisibility("private", true)).toBe("private");
    expect(effectiveVisibility("followers", true)).toBe("followers");
  });

  it("leaves an open account alone", () => {
    for (const level of VISIBILITY_LEVELS) {
      expect(effectiveVisibility(level, false)).toBe(level);
    }
  });
});

describe("canView", () => {
  it("lets the owner read their own private content", () => {
    expect(view({ viewerId: OWNER, visibility: "private" })).toBe(true);
  });

  it("lets the owner read their own content while blocked", () => {
    /* A block must never lock a user out of their own data */
    expect(view({ viewerId: OWNER, visibility: "private", isBlocked: true })).toBe(
      true,
    );
  });

  it("hides private content from everyone else", () => {
    expect(view({ visibility: "private" })).toBe(false);
    expect(view({ visibility: "private", isFollower: true })).toBe(false);
  });

  it("requires an accepted follow for followers-only content", () => {
    expect(view({ visibility: "followers", isFollower: false })).toBe(false);
    expect(view({ visibility: "followers", isFollower: true })).toBe(true);
  });

  it("shows public content without a follow", () => {
    expect(view({ visibility: "public" })).toBe(true);
  });

  it("puts a block above every visibility level", () => {
    expect(view({ visibility: "public", isBlocked: true })).toBe(false);
    expect(
      view({ visibility: "followers", isFollower: true, isBlocked: true }),
    ).toBe(false);
  });

  it("gives an anonymous viewer public content only", () => {
    expect(view({ viewerId: null, visibility: "public" })).toBe(true);
    expect(view({ viewerId: null, visibility: "followers" })).toBe(false);
    expect(view({ viewerId: null, visibility: "private" })).toBe(false);
  });

  it("does not let an anonymous viewer borrow follower status", () => {
    expect(
      view({ viewerId: null, visibility: "followers", isFollower: true }),
    ).toBe(false);
  });

  it("still requires a follow for a public row on a private account", () => {
    /* The combination a naive per-row check gets wrong */
    expect(view({ visibility: "public", ownerIsPrivate: true })).toBe(false);
    expect(
      view({ visibility: "public", ownerIsPrivate: true, isFollower: true }),
    ).toBe(true);
  });

  it("fails closed when the owner is missing", () => {
    expect(view({ ownerId: null, visibility: "public" })).toBe(false);
  });
});

describe("canViewUserContent", () => {
  it("always allows self", () => {
    expect(canViewUserContent(user({ relationship: "self", is_private: true }))).toBe(
      true,
    );
  });

  it("never allows a blocked relationship", () => {
    expect(
      canViewUserContent(user({ relationship: "blocked", is_private: false })),
    ).toBe(false);
  });

  it("allows any viewer on an open account", () => {
    expect(canViewUserContent(user({ is_private: false }))).toBe(true);
  });

  it("requires an accepted follow on a private account", () => {
    expect(
      canViewUserContent(user({ is_private: true, relationship: "requested" })),
    ).toBe(false);
    expect(
      canViewUserContent(user({ is_private: true, relationship: "following" })),
    ).toBe(true);
  });
});

describe("relationshipFromFollow", () => {
  it("puts self above everything", () => {
    expect(relationshipFromFollow(OWNER, OWNER, null)).toBe("self");
  });

  it("puts a block above an existing follow", () => {
    expect(relationshipFromFollow(VIEWER, OWNER, "accepted", true)).toBe("blocked");
  });

  it("separates pending from accepted", () => {
    expect(relationshipFromFollow(VIEWER, OWNER, "pending")).toBe("requested");
    expect(relationshipFromFollow(VIEWER, OWNER, "accepted")).toBe("following");
  });

  it("defaults to none", () => {
    expect(relationshipFromFollow(VIEWER, OWNER, null)).toBe("none");
    expect(relationshipFromFollow(null, OWNER, null)).toBe("none");
  });
});

describe("followButtonLabel", () => {
  it("covers every relationship state", () => {
    const states: RelationshipState[] = [
      "self",
      "none",
      "requested",
      "following",
      "blocked",
    ];
    for (const state of states) {
      expect(followButtonLabel(state).length).toBeGreaterThan(0);
    }
    expect(followButtonLabel("requested")).toBe("Requested");
    expect(followButtonLabel("none")).toBe("Follow");
  });
});

describe("willCreateRequest", () => {
  it("is true only for an unfollowed private account", () => {
    expect(willCreateRequest(user({ is_private: true, relationship: "none" }))).toBe(
      true,
    );
    expect(willCreateRequest(user({ is_private: false, relationship: "none" }))).toBe(
      false,
    );
    expect(
      willCreateRequest(user({ is_private: true, relationship: "following" })),
    ).toBe(false);
  });
});

describe("normalizeUsername", () => {
  it.each([
    ["Tudor", "tudor"],
    ["  Tudor  ", "tudor"],
    ["@Tudor", "tudor"],
    ["@@tudor", "tudor"],
    ["TUDOR_99", "tudor_99"],
    [null, ""],
    [undefined, ""],
  ])("normalizes %s to %s", (raw, expected) => {
    expect(normalizeUsername(raw as string | null)).toBe(expected);
  });
});

describe("checkUsername", () => {
  it.each(["tudor", "tudor_99", "mihai_micle", "abc"])("accepts %s", (raw) => {
    expect(checkUsername(raw).valid).toBe(true);
  });

  it.each([
    ["ab", "too short"],
    ["a".repeat(31), "too long"],
    ["9tudor", "starts with a digit"],
    ["_tudor", "starts with an underscore"],
    ["tudor-micle", "hyphen"],
    ["tudor micle", "space"],
    ["tudor!", "punctuation"],
    ["admin", "reserved"],
    ["", "empty"],
  ])("rejects %s (%s)", (raw) => {
    const result = checkUsername(raw);
    expect(result.valid).toBe(false);
    expect(result.reason).toBeTruthy();
  });

  it("applies reserved checks after normalisation", () => {
    for (const raw of ["Admin", "ADMIN", "@admin", "  admin  "]) {
      expect(checkUsername(raw).valid).toBe(false);
    }
  });

  it("returns the normalized handle even when invalid", () => {
    expect(checkUsername("@ADMIN").username).toBe("admin");
  });
});

describe("displayName", () => {
  it("prefers a full name", () => {
    expect(displayName(user({ first_name: "Tudor", last_name: "Micle" }))).toBe(
      "Tudor Micle",
    );
  });

  it("uses a partial name when only one half is set", () => {
    expect(displayName(user({ first_name: "Tudor" }))).toBe("Tudor");
  });

  it("falls back to the handle then to a generic label", () => {
    expect(displayName(user({ username: "tudor" }))).toBe("@tudor");
    expect(displayName(user({ username: null }))).toBe("FitnessTracker user");
  });
});

describe("visibility levels", () => {
  it("is ordered from closed to open", () => {
    expect([...VISIBILITY_LEVELS]).toEqual<Visibility[]>([
      "private",
      "followers",
      "public",
    ]);
  });
});
