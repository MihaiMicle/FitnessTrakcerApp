'use client';

import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { actorLine, formatWhen, normalizeEventType } from '@/lib/feed/events';
import { displayName } from '@/lib/social/visibility';
import type { FeedEventItem } from '@/types/feed';
import { ACCENTS } from './accents';

interface FeedCardHeaderProps {
  event: FeedEventItem;
}

/* Author row: avatar, name line, timestamp, and the accent icon for the type */
export default function FeedCardHeader({ event }: FeedCardHeaderProps) {
  const router = useRouter();
  const { Icon, color } = ACCENTS[normalizeEventType(event.event_type)];

  return (
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
  );
}
