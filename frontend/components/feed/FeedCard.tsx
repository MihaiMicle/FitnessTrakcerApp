'use client';

import { useCallback, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmModal from '@/components/shared/ConfirmModal';
import { useConfirm } from '@/components/shared/useConfirm';
import { deletePost } from '@/lib/feed/api';
import { normalizeEventType, summaryLine } from '@/lib/feed/events';
import { saveEventToLibrary } from '@/lib/feed/saveToLibrary';
import { supabase } from '@/lib/supabase';
import type { CopyDestination } from '@/lib/feed/copyToLibrary';
import type { FeedEventItem } from '@/types/feed';
import FeedComments from './FeedComments';
import FeedCardActions from './card/FeedCardActions';
import FeedCardDetails, { hasDetails } from './card/FeedCardDetails';
import FeedCardHeader from './card/FeedCardHeader';
import { ACCENTS } from './card/accents';

const SAVED_MESSAGES: Record<CopyDestination, string> = {
  routine: 'Saved to your routines!',
  recipe: 'Saved to your recipes!',
  meal: 'Saved to your meals!',
  none: '',
};

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
  const [showDetails, setShowDetails] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);
  const confirm = useConfirm();

  const handleDelete = async () => {
    toast.loading('Deleting...', { id: 'delete-post' });
    try {
      await deletePost(event.id);
      setIsDeleted(true); // Hide the card locally without refetching the whole feed
      toast.success('Post deleted', { id: 'delete-post' });
    } catch {
      toast.error('Failed to delete post', { id: 'delete-post' });
    }
  };

  const handleRequestDelete = () => {
    confirm.ask({
      title: 'Delete Post?',
      message:
        'This action cannot be undone. Are you sure you want to remove this from your feed?',
      confirmText: 'Delete',
      isDestructive: true,
      action: handleDelete,
    });
  };

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    toast.loading('Saving to your library...', { id: 'copy-post' });
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const destination = await saveEventToLibrary(
        event,
        session.access_token,
        session.user.id,
      );
      if (SAVED_MESSAGES[destination]) {
        toast.success(SAVED_MESSAGES[destination], { id: 'copy-post' });
      }
    } catch (err) {
      console.error('Copy Error:', err);
      toast.error('Failed to save', { id: 'copy-post' });
    }
  };

  const type = normalizeEventType(event.event_type);
  const { ring } = ACCENTS[type];
  const summary = summaryLine(type, event.payload);

  /* Stable so the comment thread's effect does not refire on every render */
  const handleCountChange = useCallback(
    (count: number) => onCommentCountChange(event.id, count),
    [event.id, onCommentCountChange],
  );

  if (isDeleted) return null;

  return (
    <article
      className={`bg-neutral-900 border ${ring} rounded-xl p-4 sm:p-5 space-y-3`}
    >
      <FeedCardHeader event={event} />

      <div>
        <h3 className={`font-bold text-lg ${ACCENTS[type].color}`}>
          {event.title}
        </h3>
        {summary && (
          <p className="text-xs font-mono text-neutral-500 mt-0.5">{summary}</p>
        )}

        {hasDetails(event) && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowDetails(!showDetails);
            }}
            className="flex items-center gap-1.5 text-[11px] font-mono text-neutral-400 hover:text-white transition-colors mt-3 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 px-3 py-1.5 rounded-lg active:scale-95"
          >
            {showDetails ? (
              <>
                <ChevronUp size={14} />
                HIDE DETAILS
              </>
            ) : (
              <>
                <ChevronDown size={14} />
                SHOW DETAILS
              </>
            )}
          </button>
        )}

        {showDetails && <FeedCardDetails event={event} />}
      </div>

      <FeedCardActions
        event={event}
        onToggleComments={() => setShowComments((open) => !open)}
        onCopy={handleCopy}
        onRequestDelete={handleRequestDelete}
      />

      {/* Mounted only when opened, so a page of cards is not a page of
          comment requests */}
      {showComments && (
        <FeedComments eventId={event.id} onCountChange={handleCountChange} />
      )}

      <ConfirmModal {...confirm.modalProps} />
    </article>
  );
}
