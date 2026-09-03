'use client';

import { useCallback, useState } from 'react';
import {
  Dumbbell,
  Heart,
  ListChecks,
  MessageCircle,
  Trophy,
  Utensils,
  ChefHat,
  BookCheck,
  Share2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
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
import toast from 'react-hot-toast';
import { nativeShare } from '@/lib/share';

/* One accent per activity, so the feed is scannable without reading it */
const ACCENTS = {
  workout: {
    Icon: Dumbbell,
    color: 'text-indigo-400',
    ring: 'border-indigo-500/20',
  },
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
  meal_shared: {
    Icon: Utensils,
    color: 'text-emerald-400',
    ring: 'border-emerald-500/20',
  },
  recipe_shared: {
    Icon: ChefHat,
    color: 'text-amber-400',
    ring: 'border-amber-500/30',
  },
  diary_shared: {
    Icon: BookCheck,
    color: 'text-sky-400',
    ring: 'border-sky-500/20',
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
  const router = useRouter();

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
        <div
          className="flex items-start gap-3 flex-1 min-w-0 cursor-pointer group"
          onClick={(e) => {
            e.stopPropagation();
            if (event.author.username) {
              router.push(`/users/${event.author.username}`);
            } else {
              // Shows a popup instead of silently failing
              toast.error('A public handle is required to view this profile.');
            }
          }}
        >
          {event.author.avatar_url ? (
            <img
              src={event.author.avatar_url}
              alt={displayName(event.author)}
              className="w-9 h-9 rounded-full object-cover border border-neutral-800"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-neutral-800 flex items-center justify-center text-xs font-bold text-neutral-400 group-hover:text-indigo-400 transition-colors">
              {displayName(event.author).charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-neutral-400 group-hover:text-indigo-400 transition-colors">
              {actorLine(event)}
            </p>
            <p className="text-[10px] font-mono text-neutral-600">
              {formatWhen(event.occurred_at)}
            </p>
          </div>
        </div>
        <div className="shrink-0">
          <Icon size={18} className={color} />
        </div>
      </header>
      <div>
        <h3 className={`font-bold text-lg ${color}`}>{event.title}</h3>
        {summary && (
          <p className="text-xs font-mono text-neutral-500 mt-0.5">{summary}</p>
        )}
      </div>

      <div className="flex items-center gap-4 pt-1">
        <button
          onClick={() => setShowComments((open) => !open)}
          className="flex items-center gap-1.5 text-xs font-mono text-neutral-500 hover:text-indigo-400 transition-colors"
        >
          <MessageCircle size={16} />
          {commentLabel(event.comment_count)}
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            const text = `${actorLine(event)}: ${event.title}\n${summary ? summary : ''}`;
            nativeShare(event.title, text);
          }}
          className="flex items-center gap-1.5 text-xs font-mono text-neutral-500 hover:text-emerald-400 transition-colors ml-auto"
          title="Share Post"
        >
          <Share2 size={16} />
          Share
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
