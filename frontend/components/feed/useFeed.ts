'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { getFeed, likeEvent, unlikeEvent } from '@/lib/feed/api';
import { appendPage, replaceEvent, toggleLike } from '@/lib/feed/events';
import { subscribe } from '@/lib/offline/manager';
import type { FeedEventItem, FeedScope } from '@/types/feed';

interface UseFeedOptions {
  scope?: FeedScope;
  userId?: string;
}

export function useFeed({ scope = 'following', userId }: UseFeedOptions = {}) {
  const [events, setEvents] = useState<FeedEventItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* Guards a second page request while the first is still in flight, which an
     intersection observer will otherwise fire on every scroll tick */
  const inFlight = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const page = await getFeed({ scope, userId });
      setEvents(page.items);
      setCursor(page.next_cursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the feed');
    } finally {
      setLoading(false);
    }
  }, [scope, userId]);

  useEffect(() => {
    load();
  }, [load]);

  /*
   * Reload once the write queue empties
   *
   * A finished workout is saved through the offline queue, so the PUT that
   * makes the server emit the event lands some time after the user leaves the
   * live workout. Opening the feed in that window shows a page that is already
   * out of date, which is why it looked like a refresh was needed. Watching for
   * the queue draining is the actual signal that there is something new
   */
  useEffect(() => {
    let hadPending = false;

    return subscribe((status) => {
      const busy = status.pending > 0 || status.syncing;

      if (hadPending && !busy) load();
      hadPending = busy;
    });
  }, [load]);

  /* A workout finished in another tab lands the same way */
  useEffect(() => {
    const onFocus = () => {
      if (document.visibilityState === 'visible') load();
    };

    document.addEventListener('visibilitychange', onFocus);
    return () => document.removeEventListener('visibilitychange', onFocus);
  }, [load]);

  const loadMore = useCallback(async () => {
    if (!cursor || inFlight.current) return;

    inFlight.current = true;
    setLoadingMore(true);

    try {
      const page = await getFeed({ scope, userId, cursor });
      setEvents((current) => appendPage(current, page.items));
      setCursor(page.next_cursor);
    } catch {
      toast.error('Could not load more');
    } finally {
      inFlight.current = false;
      setLoadingMore(false);
    }
  }, [cursor, scope, userId]);

  /*
   * Flip the button immediately, then reconcile against the server
   *
   * A like is not worth a spinner. On failure the optimistic state is rolled
   * back rather than left showing a like that was never recorded
   */
  const toggleEventLike = useCallback(async (event: FeedEventItem) => {
    const optimistic = toggleLike(event);
    setEvents((current) => replaceEvent(current, optimistic));

    try {
      const result = optimistic.liked_by_me
        ? await likeEvent(event.id)
        : await unlikeEvent(event.id);

      setEvents((current) =>
        replaceEvent(current, {
          ...optimistic,
          liked_by_me: result.liked_by_me,
          like_count: result.like_count,
        }),
      );
    } catch {
      setEvents((current) => replaceEvent(current, event));
      toast.error('Could not save that');
    }
  }, []);

  /* Called by the comment sheet so the card's counter stays honest */
  const setCommentCount = useCallback((eventId: string, count: number) => {
    setEvents((current) =>
      current.map((event) =>
        event.id === eventId ? { ...event, comment_count: count } : event,
      ),
    );
  }, []);

  return {
    events,
    loading,
    loadingMore,
    error,
    hasMore: cursor !== null,
    refetch: load,
    loadMore,
    toggleEventLike,
    setCommentCount,
  };
}
