'use client';

import { useCallback, useState } from 'react';
import { Dumbbell, Heart, ListChecks, MessageCircle, Trophy } from 'lucide-react';
import {
  actorLine,
  commentLabel,
  formatWhen,
  likeLabel,
  normalizeEventType,
  summaryLine,
} from '@/lib/feed/events';
import { displayName } from '@/lib/social/visibility';
import FeedComments from './FeedComments';
import type { FeedEventItem } from '@/types/feed';

/* One accent per activity, so the feed is scannable without reading it */
const ACCENTS = {
  workout: { Icon: Dumbbell, color: 'text-indigo-400', ring: 'border-indigo-500/20' },
  personal_record: {
    Icon: Trophy,
    color: 'text-amber-400',
    ring: 'border-amber-500/30',
  },
  routine_shared: {
    Icon: ListChecks,
    color: 'text-emerald-400',
    ring: 'border-emerald-500/20',
  },
} as const;

interface FeedCardProps {
  event: FeedEventItem;
  onToggleLike: (event: FeedEventItem) => void;
  onCommentCountChange: (eventId: string, count: number) => void;
}

export default function FeedCard({
  event,
  onToggleLike,
  onCommentCountChange,
}: FeedCardProps) {
  const [showComments, setShowComments] = useState(false);

  const type = normalizeEventType(event.event_type);
  const { Icon, color, ring } = ACCENTS[type];
  const summary = summaryLine(type, event.payload);

  /* Stable so the comment thread's effect does not refire on every render */
  const handleCountChange = useCallback(
    (count: number) => onCommentCountChange(event.id, count),
    [event.id, onCommentCountChange],
  );

  return (
    <article
      className={`bg-neutral-900 border ${ring} rounded-xl p-4 sm:p-5 space-y-3`}
    >
      <header className="flex items-start gap-3">
        {event.author.avatar_url ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={event.author.avatar_url}
            alt={displayName(event.author)}
            className="w-9 h-9 rounded-full object-cover border border-neutral-800"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-neutral-800 flex items-center justify-center text-xs font-bold text-neutral-400">
            {displayName(event.author).charAt(0).toUpperCase()}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className="text-xs text-neutral-400">{actorLine(event)}</p>
          <p className="text-[10px] font-mono text-neutral-600">
            {formatWhen(event.occurred_at)}
          </p>
        </div>

        <Icon size={18} className={color} />
      </header>

      <div>
        <h3 className={`font-bold text-lg ${color}`}>{event.title}</h3>
        {summary && (
          <p className="text-xs font-mono text-neutral-500 mt-0.5">{summary}</p>
        )}
      </div>

      <div className="flex items-center gap-4 pt-1">
        <button
          onClick={() => onToggleLike(event)}
          className={`flex items-center gap-1.5 text-xs font-mono transition-colors ${
            event.liked_by_me
              ? 'text-rose-500'
              : 'text-neutral-500 hover:text-rose-400'
          }`}
        >
          <Heart
            size={16}
            fill={event.liked_by_me ? 'currentColor' : 'none'}
          />
          {likeLabel(event.like_count)}
        </button>

        <button
          onClick={() => setShowComments((open) => !open)}
          className="flex items-center gap-1.5 text-xs font-mono text-neutral-500 hover:text-indigo-400 transition-colors"
        >
          <MessageCircle size={16} />
          {commentLabel(event.comment_count)}
        </button>
      </div>

      {/* Mounted only when opened, so a page of cards is not a page of
          comment requests */}
      {showComments && (
        <FeedComments eventId={event.id} onCountChange={handleCountChange} />
      )}
    </article>
  );
}
