'use client';

import { Copy, MessageCircle, Share2, Trash2 } from 'lucide-react';
import { actorLine, commentLabel, summaryLine, normalizeEventType } from '@/lib/feed/events';
import { nativeShare } from '@/lib/share';
import type { FeedEventItem } from '@/types/feed';

interface FeedCardActionsProps {
  event: FeedEventItem;
  onToggleComments: () => void;
  onCopy: (e: React.MouseEvent) => void;
  onRequestDelete: () => void;
}

export default function FeedCardActions({
  event,
  onToggleComments,
  onCopy,
  onRequestDelete,
}: FeedCardActionsProps) {
  const summary = summaryLine(normalizeEventType(event.event_type), event.payload);

  return (
    <div className="flex items-center gap-4 pt-1">
      <button
        onClick={onToggleComments}
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

      <button
        onClick={onCopy}
        className="flex items-center gap-1.5 text-xs font-mono text-neutral-500 hover:text-sky-400 transition-colors"
        title="Save to Library"
      >
        <Copy size={16} />
        Save
      </button>

      {event.author.relationship === 'self' && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRequestDelete();
          }}
          className="flex items-center gap-1.5 text-xs font-mono text-neutral-500 hover:text-rose-500 transition-colors"
          title="Delete Post"
        >
          <Trash2 size={16} />
        </button>
      )}
    </div>
  );
}
