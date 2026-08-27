"""
Tests for the social access-control rules

These are the rules that decide whether one user can read another user's
workouts and body photos, so the failure mode is a privacy leak rather than a
wrong number. Every branch of `can_view` is covered explicitly, including the
combinations that only matter together (private account plus public row,
blocked plus owner)

`core/social.py` imports nothing from the app, so these tests need no database
"""

import pytest

from core.social import (
    FOLLOW_ACCEPTED,
    FOLLOW_PENDING,
    REL_BLOCKED,
    REL_FOLLOWING,
    REL_NONE,
    REL_REQUESTED,
    REL_SELF,
    VISIBILITY_FOLLOWERS,
    VISIBILITY_PRIVATE,
    VISIBILITY_PUBLIC,
    UsernameError,
    can_view,
    effective_visibility,
    initial_follow_status,
    is_valid_username,
    normalize_username,
    normalize_visibility,
    relationship_state,
    validate_username,
    visible_levels_for,
)

OWNER = "owner-uuid"
VIEWER = "viewer-uuid"


def view(**overrides):
    base = dict(
        viewer_id=VIEWER,
        owner_id=OWNER,
        visibility=VISIBILITY_PUBLIC,
        owner_is_private=False,
        is_follower=False,
        is_blocked=False,
    )
    return can_view(**{**base, **overrides})


# Visibility normalisation


def test_unknown_visibility_falls_back_to_private():
    """
    A row written before this feature, or corrupted, must not read as public.
    The fallback is the closed end of the range on purpose
    """
    assert normalize_visibility(None) == VISIBILITY_PRIVATE
    assert normalize_visibility("") == VISIBILITY_PRIVATE
    assert normalize_visibility("friends-only") == VISIBILITY_PRIVATE
    assert normalize_visibility(42) == VISIBILITY_PRIVATE


def test_known_visibility_passes_through():
    for level in (VISIBILITY_PRIVATE, VISIBILITY_FOLLOWERS, VISIBILITY_PUBLIC):
        assert normalize_visibility(level) == level


def test_private_account_clamps_public_rows_to_followers():
    """
    The whole point of the account toggle: flipping to private hides existing
    public rows without rewriting them, and flipping back restores them
    """
    assert (
        effective_visibility(VISIBILITY_PUBLIC, owner_is_private=True)
        == VISIBILITY_FOLLOWERS
    )


def test_private_account_does_not_open_up_closed_rows():
    """Clamping only ever tightens, it never loosens"""
    assert (
        effective_visibility(VISIBILITY_PRIVATE, owner_is_private=True)
        == VISIBILITY_PRIVATE
    )
    assert (
        effective_visibility(VISIBILITY_FOLLOWERS, owner_is_private=True)
        == VISIBILITY_FOLLOWERS
    )


def test_open_account_leaves_visibility_alone():
    for level in (VISIBILITY_PRIVATE, VISIBILITY_FOLLOWERS, VISIBILITY_PUBLIC):
        assert effective_visibility(level, owner_is_private=False) == level


# can_view


def test_owner_sees_own_private_content():
    assert view(viewer_id=OWNER, visibility=VISIBILITY_PRIVATE) is True


def test_owner_sees_own_content_even_when_blocked():
    """
    A block must never lock a user out of their own data. This is the one case
    where the block check has to come after the ownership check
    """
    assert view(viewer_id=OWNER, visibility=VISIBILITY_PRIVATE, is_blocked=True) is True


def test_private_content_is_invisible_to_everyone_else():
    assert view(visibility=VISIBILITY_PRIVATE) is False
    assert view(visibility=VISIBILITY_PRIVATE, is_follower=True) is False


def test_followers_content_needs_an_accepted_follow():
    assert view(visibility=VISIBILITY_FOLLOWERS, is_follower=False) is False
    assert view(visibility=VISIBILITY_FOLLOWERS, is_follower=True) is True


def test_public_content_is_visible_without_following():
    assert view(visibility=VISIBILITY_PUBLIC, is_follower=False) is True


def test_block_beats_public():
    """A block has to outrank every visibility level, not just the closed ones"""
    assert view(visibility=VISIBILITY_PUBLIC, is_blocked=True) is False
    assert view(visibility=VISIBILITY_FOLLOWERS, is_follower=True, is_blocked=True) is False


def test_anonymous_viewer_only_ever_sees_public():
    assert view(viewer_id=None, visibility=VISIBILITY_PUBLIC) is True
    assert view(viewer_id=None, visibility=VISIBILITY_FOLLOWERS) is False
    assert view(viewer_id=None, visibility=VISIBILITY_PRIVATE) is False


def test_anonymous_viewer_cannot_borrow_follower_status():
    """
    is_follower should be impossible to set for an anonymous caller, but if a
    caller passes it anyway the check must not honour it
    """
    assert view(viewer_id=None, visibility=VISIBILITY_FOLLOWERS, is_follower=True) is False


def test_private_account_public_row_still_needs_a_follow():
    """The combination that a naive per-row check would get wrong"""
    assert view(visibility=VISIBILITY_PUBLIC, owner_is_private=True, is_follower=False) is False
    assert view(visibility=VISIBILITY_PUBLIC, owner_is_private=True, is_follower=True) is True


def test_missing_owner_is_never_visible():
    """Orphaned content fails closed rather than becoming world readable"""
    assert view(owner_id=None, visibility=VISIBILITY_PUBLIC) is False


# visible_levels_for


def test_levels_match_can_view_for_every_combination():
    """
    The list filter and the per-row check must agree, or a listing endpoint
    will return a row that a detail endpoint then refuses to serve
    """
    for viewer in (None, VIEWER, OWNER):
        for is_follower in (False, True):
            for is_blocked in (False, True):
                levels = visible_levels_for(
                    viewer_id=viewer,
                    owner_id=OWNER,
                    is_follower=is_follower,
                    is_blocked=is_blocked,
                )
                for level in (
                    VISIBILITY_PRIVATE,
                    VISIBILITY_FOLLOWERS,
                    VISIBILITY_PUBLIC,
                ):
                    expected = can_view(
                        viewer_id=viewer,
                        owner_id=OWNER,
                        visibility=level,
                        is_follower=is_follower,
                        is_blocked=is_blocked,
                    )
                    assert (level in levels) is expected, (
                        viewer,
                        level,
                        is_follower,
                        is_blocked,
                    )


def test_blocked_viewer_gets_no_levels():
    assert visible_levels_for(viewer_id=VIEWER, owner_id=OWNER, is_blocked=True) == ()


# Relationship state


def test_relationship_self_wins_over_everything():
    assert (
        relationship_state(viewer_id=OWNER, target_id=OWNER, follow_status=None)
        == REL_SELF
    )


def test_relationship_block_outranks_an_existing_follow():
    assert (
        relationship_state(
            viewer_id=VIEWER,
            target_id=OWNER,
            follow_status=FOLLOW_ACCEPTED,
            is_blocked=True,
        )
        == REL_BLOCKED
    )


def test_relationship_distinguishes_pending_from_accepted():
    assert (
        relationship_state(
            viewer_id=VIEWER, target_id=OWNER, follow_status=FOLLOW_PENDING
        )
        == REL_REQUESTED
    )
    assert (
        relationship_state(
            viewer_id=VIEWER, target_id=OWNER, follow_status=FOLLOW_ACCEPTED
        )
        == REL_FOLLOWING
    )


def test_relationship_defaults_to_none():
    assert (
        relationship_state(viewer_id=VIEWER, target_id=OWNER, follow_status=None)
        == REL_NONE
    )


def test_following_a_private_account_starts_pending():
    assert initial_follow_status(target_is_private=True) == FOLLOW_PENDING
    assert initial_follow_status(target_is_private=False) == FOLLOW_ACCEPTED


# Usernames


@pytest.mark.parametrize(
    "raw,expected",
    [
        ("Tudor", "tudor"),
        ("  Tudor  ", "tudor"),
        ("@Tudor", "tudor"),
        ("TUDOR_99", "tudor_99"),
        (None, ""),
    ],
)
def test_normalize_username(raw, expected):
    assert normalize_username(raw) == expected


@pytest.mark.parametrize(
    "raw", ["tudor", "tudor_99", "mihai_micle", "abc", "a" + "b" * 29]
)
def test_valid_usernames(raw):
    assert is_valid_username(raw) is True


@pytest.mark.parametrize(
    "raw,reason",
    [
        ("ab", "too short"),
        ("a" * 31, "too long"),
        ("9tudor", "must start with a letter"),
        ("_tudor", "must start with a letter"),
        ("tudor-micle", "hyphen not allowed"),
        ("tudor micle", "space not allowed"),
        ("tudor!", "punctuation not allowed"),
        ("admin", "reserved"),
        ("me", "reserved and too short"),
        ("", "empty"),
        (None, "missing"),
    ],
)
def test_invalid_usernames(raw, reason):
    assert is_valid_username(raw) is False, reason
    with pytest.raises(UsernameError):
        validate_username(raw)


def test_reserved_check_runs_after_normalisation():
    """@Admin and ADMIN must be rejected the same way admin is"""
    for raw in ("Admin", "ADMIN", "@admin", "  admin  "):
        assert is_valid_username(raw) is False
