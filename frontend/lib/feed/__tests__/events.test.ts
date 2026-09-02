/* lib/feed/__tests__/events.test.ts */

import { describe, expect, it } from 'vitest';
import {
  COMMENT_MAX_LENGTH,
  actorLine,
  appendPage,
  checkComment,
  commentLabel,
  formatDuration,
  formatVolume,
  formatWeight,
  formatWhen,
  isFeedEventType,
  likeLabel,
  normalizeEventType,
  removeComment,
  replaceEvent,
  summaryLine,
  toggleLike,
} from '@/lib/feed/events';
import type { FeedCommentItem, FeedEventItem } from '@/types/feed';
import type { PublicUserSummary } from '@/types/social';

function makeAuthor(overrides: Partial<PublicUserSummary> = {}): PublicUserSummary {
  return {
    id: 'user-1',
    username: 'tudor',
    first_name: 'Tudor',
    last_name: null,
    avatar_url: null,
    is_private: false,
    relationship: 'following',
    ...overrides,
  };
}

function makeEvent(overrides: Partial<FeedEventItem> = {}): FeedEventItem {
  return {
    id: 'event-1',
    event_type: 'workout',
    visibility: 'followers',
    author: makeAuthor(),
    subject_type: 'workout_session',
    subject_id: 'session-1',
    title: 'Push Day',
    payload: {},
    like_count: 0,
    comment_count: 0,
    liked_by_me: false,
    occurred_at: '2026-08-26T12:00:00Z',
    ...overrides,
  };
}

describe('normalizeEventType', () => {
  it('passes a known type through', () => {
    expect(normalizeEventType('personal_record')).toBe('personal_record');
  });

  it.each([null, undefined, '', 'nonsense', 7, {}])(
    'falls back to workout for %p',
    (value) => {
      expect(normalizeEventType(value)).toBe('workout');
    },
  );

  it('recognises every type it can render', () => {
    expect(isFeedEventType('routine_shared')).toBe(true);
    expect(isFeedEventType('progress_photo')).toBe(false);
  });
});

describe('formatWeight', () => {
  it('drops the decimal on a whole number', () => {
    expect(formatWeight(100)).toBe('100 kg');
  });

  it('keeps one decimal when there is one', () => {
    expect(formatWeight(102.5)).toBe('102.5 kg');
  });

  it('rounds to one decimal', () => {
    expect(formatWeight(102.46)).toBe('102.5 kg');
  });

  it.each([null, undefined, 'heavy', NaN])('treats %p as zero', (value) => {
    expect(formatWeight(value)).toBe('0 kg');
  });
});

describe('formatVolume', () => {
  it('rounds and groups thousands', () => {
    expect(formatVolume(12345.6)).toBe('12,346 kg');
  });

  it('handles a missing total', () => {
    expect(formatVolume(undefined)).toBe('0 kg');
  });
});

describe('formatDuration', () => {
  it('shows hours and minutes past an hour', () => {
    expect(formatDuration(3600 + 42 * 60)).toBe('1h 42m');
  });

  it('shows minutes alone under an hour', () => {
    expect(formatDuration(42 * 60)).toBe('42m');
  });

  it('does not report a zero minute workout', () => {
    expect(formatDuration(30)).toBe('< 1m');
  });

  it.each([0, -100, null, undefined, 'ages'])(
    'treats %p as no elapsed time',
    (value) => {
      expect(formatDuration(value)).toBe('< 1m');
    },
  );
});

describe('formatWhen', () => {
  const now = new Date('2026-08-26T12:00:00Z').getTime();

  it('reads as just now inside a minute', () => {
    expect(formatWhen('2026-08-26T11:59:30Z', now)).toBe('just now');
  });

  it('counts minutes under an hour', () => {
    expect(formatWhen('2026-08-26T11:30:00Z', now)).toBe('30m ago');
  });

  it('counts hours under a day', () => {
    expect(formatWhen('2026-08-26T04:00:00Z', now)).toBe('8h ago');
  });

  it('counts days under a week', () => {
    expect(formatWhen('2026-08-23T12:00:00Z', now)).toBe('3d ago');
  });

  it('falls back to a date past a week', () => {
    /* Locale formatting varies, so assert only that it stopped counting */
    expect(formatWhen('2026-01-01T12:00:00Z', now)).not.toMatch(/ago|just now/);
  });

  it.each([null, undefined, '', 'not a date'])(
    'returns nothing for %p',
    (value) => {
      expect(formatWhen(value, now)).toBe('');
    },
  );
});

describe('summaryLine', () => {
  it('lists the numbers a workout card shows', () => {
    const line = summaryLine('workout', {
      exercise_count: 4,
      set_count: 16,
      total_volume_kg: 8200,
      duration_seconds: 3900,
    });
    expect(line).toBe('4 exercises • 16 sets • 8,200 kg • 1h 5m');
  });

  it('singularises a one exercise workout', () => {
    expect(summaryLine('workout', { exercise_count: 1, set_count: 1 })).toBe(
      '1 exercise • 1 set',
    );
  });

  it('omits totals that are zero rather than printing them', () => {
    expect(summaryLine('workout', { set_count: 5 })).toBe('5 sets');
  });

  it('includes distance for a cardio session', () => {
    expect(summaryLine('workout', { total_distance_km: 5.2 })).toBe('5.2 km');
  });

  it('returns nothing for an empty workout', () => {
    expect(summaryLine('workout', {})).toBe('');
  });

  it('shows the lift and the improvement for a record', () => {
    const line = summaryLine('personal_record', {
      weight_kg: 110,
      reps: 5,
      improvement_kg: 8.3,
    });
    expect(line).toBe('110 kg x 5 • +8.3 kg est. 1RM');
  });

  it('omits the improvement when there is none to show', () => {
    expect(summaryLine('personal_record', { weight_kg: 110, reps: 5 })).toBe(
      '110 kg x 5',
    );
  });

  it('counts the exercises in a shared routine', () => {
    expect(summaryLine('routine_shared', { exercise_count: 6 })).toBe(
      '6 exercises',
    );
  });

  it('handles a null payload', () => {
    expect(summaryLine('workout', null)).toBe('');
  });
});

describe('actorLine', () => {
  it('names the author of a workout', () => {
    expect(actorLine(makeEvent())).toBe('Tudor finished a workout');
  });

  it('names the author of a record', () => {
    expect(actorLine(makeEvent({ event_type: 'personal_record' }))).toBe(
      'Tudor hit a personal record',
    );
  });

  it('names the author of a shared routine', () => {
    expect(actorLine(makeEvent({ event_type: 'routine_shared' }))).toBe(
      'Tudor shared a routine',
    );
  });

  it('falls back to the handle when there is no name', () => {
    const author = makeAuthor({ first_name: null, last_name: null });
    expect(actorLine(makeEvent({ author }))).toBe('@tudor finished a workout');
  });
});

describe('likeLabel and commentLabel', () => {
  it('singularises one', () => {
    expect(likeLabel(1)).toBe('1 like');
    expect(commentLabel(1)).toBe('1 comment');
  });

  it('pluralises anything else', () => {
    expect(likeLabel(0)).toBe('0 likes');
    expect(commentLabel(4)).toBe('4 comments');
  });

  it('never shows a negative count', () => {
    expect(likeLabel(-3)).toBe('0 likes');
  });
});

describe('toggleLike', () => {
  it('likes an unliked event', () => {
    const result = toggleLike(makeEvent({ like_count: 4 }));
    expect(result.liked_by_me).toBe(true);
    expect(result.like_count).toBe(5);
  });

  it('unlikes a liked event', () => {
    const result = toggleLike(makeEvent({ liked_by_me: true, like_count: 4 }));
    expect(result.liked_by_me).toBe(false);
    expect(result.like_count).toBe(3);
  });

  it('clamps at zero when the count is already stale', () => {
    const result = toggleLike(makeEvent({ liked_by_me: true, like_count: 0 }));
    expect(result.like_count).toBe(0);
  });

  it('does not mutate the event it was given', () => {
    const event = makeEvent({ like_count: 1 });
    toggleLike(event);
    expect(event.like_count).toBe(1);
    expect(event.liked_by_me).toBe(false);
  });
});

describe('replaceEvent', () => {
  it('swaps the matching event only', () => {
    const events = [makeEvent(), makeEvent({ id: 'event-2', title: 'Legs' })];
    const updated = replaceEvent(events, makeEvent({ title: 'Renamed' }));

    expect(updated[0].title).toBe('Renamed');
    expect(updated[1].title).toBe('Legs');
  });

  it('leaves the list alone when nothing matches', () => {
    const events = [makeEvent()];
    expect(replaceEvent(events, makeEvent({ id: 'missing' }))).toEqual(events);
  });
});

describe('appendPage', () => {
  it('adds a page to the end', () => {
    const page = appendPage([makeEvent()], [makeEvent({ id: 'event-2' })]);
    expect(page.map((event) => event.id)).toEqual(['event-1', 'event-2']);
  });

  it('drops an id that is already loaded', () => {
    /* A workout finished between two page loads can land on a boundary */
    const page = appendPage([makeEvent()], [makeEvent(), makeEvent({ id: 'event-2' })]);
    expect(page.map((event) => event.id)).toEqual(['event-1', 'event-2']);
  });

  it('handles an empty incoming page', () => {
    expect(appendPage([makeEvent()], [])).toHaveLength(1);
  });
});

describe('checkComment', () => {
  it('accepts a trimmed comment', () => {
    const result = checkComment('  strong work  ');
    expect(result).toEqual({ valid: true, body: 'strong work', reason: null });
  });

  it.each([null, undefined, '', '   ', '\n\t'])('rejects %p', (value) => {
    expect(checkComment(value).valid).toBe(false);
  });

  it('accepts a comment at the limit', () => {
    expect(checkComment('x'.repeat(COMMENT_MAX_LENGTH)).valid).toBe(true);
  });

  it('rejects a comment over the limit', () => {
    const result = checkComment('x'.repeat(COMMENT_MAX_LENGTH + 1));
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('at most');
  });
});

describe('removeComment', () => {
  const comment = (id: string): FeedCommentItem => ({
    id,
    event_id: 'event-1',
    author: makeAuthor(),
    body: 'nice',
    created_at: null,
    can_delete: true,
  });

  it('drops the matching comment', () => {
    const left = removeComment([comment('a'), comment('b')], 'a');
    expect(left.map((entry) => entry.id)).toEqual(['b']);
  });

  it('leaves the list alone when nothing matches', () => {
    expect(removeComment([comment('a')], 'missing')).toHaveLength(1);
  });
});
