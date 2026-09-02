'use client';

import { Users } from 'lucide-react';
import FeedCard from './FeedCard';
import type { FeedEventItem } from '@/types/feed';

interface FeedListProps {
  events: FeedEventItem[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  emptyMessage: string;
  onRetry: () => void;
  onLoadMore: () => void;
  onToggleLike: (event: FeedEventItem) => void;
  onCommentCountChange: (eventId: string, count: number) => void;
}

export default function FeedList({
  events,
  loading,
  loadingMore,
  error,
  hasMore,
  emptyMessage,
  onRetry,
  onLoadMore,
  onToggleLike,
  onCommentCountChange,
}: FeedListProps) {
  if (loading) {
    return (
      <p className="py-12 text-center text-neutral-500 font-mono text-sm animate-pulse">
        Loading feed...
      </p>
    );
  }

  if (error) {
    return (
      <div className="py-12 flex flex-col items-center gap-3 border-2 border-dashed border-neutral-800 rounded-2xl bg-neutral-900/20">
        <p className="text-neutral-500 font-mono text-sm">{error}</p>
        <button
          onClick={onRetry}
          className="text-indigo-400 hover:text-indigo-300 font-mono text-xs tracking-widest"
        >
          TRY AGAIN
        </button>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="py-12 flex flex-col items-center justify-center border-2 border-dashed border-neutral-800 rounded-2xl bg-neutral-900/20">
        <Users size={48} className="text-neutral-800 mb-4" />
        <p className="text-neutral-500 font-mono text-sm text-center px-6">
          {emptyMessage}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {events.map((event) => (
        <FeedCard
          key={event.id}
          event={event}
          onToggleLike={onToggleLike}
          onCommentCountChange={onCommentCountChange}
        />
      ))}

      {hasMore && (
        <button
          onClick={onLoadMore}
          disabled={loadingMore}
          className="w-full py-3 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-indigo-500/50 text-neutral-400 hover:text-indigo-400 font-mono text-xs tracking-widest transition-colors disabled:opacity-50"
        >
          {loadingMore ? 'LOADING...' : 'LOAD MORE'}
        </button>
      )}
    </div>
  );
}
