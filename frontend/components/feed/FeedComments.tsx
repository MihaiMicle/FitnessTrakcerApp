'use client';

import { useEffect, useState } from 'react';
import { Send, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { deleteComment, getComments, postComment } from '@/lib/feed/api';
import {
  COMMENT_MAX_LENGTH,
  checkComment,
  formatWhen,
  removeComment,
} from '@/lib/feed/events';
import { displayName } from '@/lib/social/visibility';
import type { FeedCommentItem } from '@/types/feed';

interface FeedCommentsProps {
  eventId: string;
  onCountChange: (count: number) => void;
}

export default function FeedComments({
  eventId,
  onCountChange,
}: FeedCommentsProps) {
  const [comments, setComments] = useState<FeedCommentItem[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    getComments(eventId)
      .then((loaded) => {
        /* The thread can be closed before the request lands */
        if (cancelled) return;
        setComments(loaded);
        onCountChange(loaded.length);
      })
      .catch(() => {
        if (!cancelled) toast.error('Could not load comments');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [eventId, onCountChange]);

  const submit = async () => {
    const check = checkComment(draft);
    if (!check.valid) {
      if (draft.trim()) toast.error(check.reason as string);
      return;
    }

    setSending(true);
    try {
      const created = await postComment(eventId, check.body);
      const next = [...comments, created];
      setComments(next);
      onCountChange(next.length);
      setDraft('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not post that');
    } finally {
      setSending(false);
    }
  };

  const remove = async (commentId: string) => {
    const previous = comments;
    const next = removeComment(comments, commentId);

    setComments(next);
    onCountChange(next.length);

    try {
      await deleteComment(commentId);
    } catch {
      setComments(previous);
      onCountChange(previous.length);
      toast.error('Could not delete that');
    }
  };

  return (
    <div className="border-t border-neutral-800 pt-3 mt-3 space-y-3">
      {loading ? (
        <p className="text-xs font-mono text-neutral-600 animate-pulse">
          Loading comments...
        </p>
      ) : comments.length === 0 ? (
        <p className="text-xs font-mono text-neutral-600">
          No comments yet. Say something.
        </p>
      ) : (
        comments.map((comment) => (
          <div key={comment.id} className="flex items-start gap-3 group">
            <div
              className={`shrink-0 ${comment.author.username ? 'cursor-pointer' : ''}`}
              onClick={() => {
                if (comment.author.username) {
                  router.push(`/users/${comment.author.username}`);
                }
              }}
            >
              {comment.author.avatar_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={comment.author.avatar_url}
                  alt={displayName(comment.author)}
                  className="w-8 h-8 rounded-full object-cover border border-neutral-800"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-xs font-bold text-neutral-400 group-hover:text-indigo-400 transition-colors">
                  {displayName(comment.author).charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span
                  className={`text-xs font-bold text-neutral-200 ${comment.author.username ? 'cursor-pointer hover:text-indigo-400 transition-colors' : ''}`}
                  onClick={() => {
                    if (comment.author.username) {
                      router.push(`/users/${comment.author.username}`);
                    }
                  }}
                >
                  {displayName(comment.author)}
                </span>
                <span className="text-[10px] font-mono text-neutral-600">
                  {formatWhen(comment.created_at)}
                </span>
              </div>
              <p className="text-sm text-neutral-300 break-words mt-0.5">
                {comment.body}
              </p>
            </div>

            {comment.can_delete && (
              <button
                onClick={() => remove(comment.id)}
                className="text-neutral-700 hover:text-rose-500 p-1 transition-colors opacity-100 sm:opacity-0 group-hover:opacity-100"
                title="Delete comment"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))
      )}

      <div className="flex items-center gap-2 pt-1">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          maxLength={COMMENT_MAX_LENGTH}
          placeholder="Add a comment"
          className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-indigo-500/50"
        />
        <button
          onClick={submit}
          disabled={sending || !draft.trim()}
          className="text-indigo-400 hover:text-indigo-300 disabled:text-neutral-700 p-2 transition-colors"
          title="Post comment"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
