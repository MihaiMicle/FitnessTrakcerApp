'use client';

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
  Copy,
  Trash2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { deletePost } from '@/lib/feed/api';
import { supabase } from '@/lib/supabase';
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
import { useCallback, useState } from 'react';

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
  const [showDetails, setShowDetails] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    setShowDeleteConfirm(false);
    toast.loading('Deleting...', { id: 'delete-post' });
    try {
      await deletePost(event.id);
      setIsDeleted(true); // Hide the card locally without refetching the whole feed
      toast.success('Post deleted', { id: 'delete-post' });
    } catch {
      toast.error('Failed to delete post', { id: 'delete-post' });
    }
  };

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    toast.loading('Saving to your library...', { id: 'copy-post' });
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      if (
        event.event_type === 'workout' ||
        event.event_type === 'routine_shared'
      ) {
        // Clean up completed flags so the new routine starts fresh for you
        const cleanExercises = (event.payload.exercises || []).map(
          (ex: any) => ({
            ...ex,
            sets: (ex.sets || []).map((s: any) => ({ ...s, completed: false })),
          }),
        );

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/workouts/templates`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              name: `${event.title} (Copied)`,
              exercises: cleanExercises,
              visibility: 'private',
            }),
          },
        );
        if (!res.ok) throw new Error('Failed to save routine');
        toast.success('Saved to your routines!', { id: 'copy-post' });
      } else if (event.event_type === 'recipe_shared') {
        // Save directly into the Recipes table
        const { error } = await supabase.from('recipes').insert({
          user_id: session.user.id,
          name: `${event.title} (Copied)`,
          ingredients: event.payload.foods || [],
          servings: 1, // Fallback to 1 serving
          macros_per_serving: {
            calories: event.payload.calories || 0,
            protein_g: event.payload.protein_g || 0,
            carbs_g: event.payload.carbs_g || 0,
            fats_g: event.payload.fats_g || 0,
          },
        });
        if (error) throw error;
        toast.success('Saved to your recipes!', { id: 'copy-post' });
      } else if (
        event.event_type === 'meal_shared' ||
        event.event_type === 'diary_shared'
      ) {
        // Save directly into the Saved Meals table
        let foodsToSave = event.payload.foods || [];
        if (event.event_type === 'diary_shared' && event.payload.meals) {
          foodsToSave = event.payload.meals;
        }

        const { error } = await supabase.from('saved_meals').insert({
          user_id: session.user.id,
          name: `${event.title} (Copied)`,
          foods: foodsToSave,
        });
        if (error) throw error;
        toast.success('Saved to your meals!', { id: 'copy-post' });
      }
    } catch (err) {
      console.error('Copy Error:', err);
      toast.error('Failed to save', { id: 'copy-post' });
    }
  };

  const type = normalizeEventType(event.event_type);
  const { Icon, color, ring } = ACCENTS[type];
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

        {((event.payload.foods?.length ?? 0) > 0 ||
          (event.payload.meals?.length ?? 0) > 0 ||
          (event.payload.exercises?.length ?? 0) > 0) && (
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

        {showDetails && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300 mt-1">
            {/* Foods for Meals/Recipes */}
            {event.payload.foods &&
              Array.isArray(event.payload.foods) &&
              event.payload.foods.length > 0 && (
                <div className="mt-3 space-y-1.5 bg-neutral-950 p-3 rounded-lg border border-neutral-800/50">
                  {event.payload.foods.map((f: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex justify-between items-start text-xs font-mono gap-4"
                    >
                      <span className="text-neutral-300 flex-1 leading-snug">
                        • {f.food_name || f.name}
                      </span>
                      <span className="text-neutral-500 shrink-0 mt-0.5">
                        {f.serving_size}
                        {f.serving_unit || 'g'}
                      </span>
                    </div>
                  ))}
                </div>
              )}

            {/* Meals for Diaries */}
            {event.payload.meals &&
              Array.isArray(event.payload.meals) &&
              event.payload.meals.length > 0 &&
              (() => {
                const grouped = event.payload.meals.reduce(
                  (acc: any, m: any) => {
                    const type = m.meal_type || 'Other';
                    if (!acc[type]) acc[type] = [];
                    acc[type].push(m);
                    return acc;
                  },
                  {},
                );

                return (
                  <div className="mt-3 space-y-4 bg-neutral-950 p-4 rounded-xl border border-neutral-800/50">
                    {Object.entries(grouped).map(
                      ([type, foods]: [string, any]) => (
                        <div key={type}>
                          <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-2">
                            {type}
                          </h4>
                          <div className="space-y-2">
                            {foods.map((m: any, idx: number) => (
                              <div
                                key={idx}
                                className="flex justify-between items-start text-xs font-mono gap-4"
                              >
                                <span className="text-neutral-300 flex-1 leading-snug">
                                  • {m.name || m.food_name}
                                </span>
                                <span className="text-neutral-500 shrink-0 mt-0.5">
                                  {m.calories} kcal
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                );
              })()}

            {/* Exercises for Workouts/Routines */}
            {event.payload.exercises &&
              Array.isArray(event.payload.exercises) &&
              event.payload.exercises.length > 0 && (
                <div className="space-y-4 mb-3 mt-4 last:mb-0">
                  {event.payload.exercises.map((ex: any, idx: number) => {
                    const validSets = ex.sets || [];

                    return (
                      <div
                        key={idx}
                        className="bg-[#121212] border border-neutral-800 rounded-xl p-3 sm:p-4"
                      >
                        {/* Header with Number Badge */}
                        <div className="flex items-center mb-2">
                          <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold mr-3 shrink-0">
                            {idx + 1}
                          </div>
                          <h4 className="text-sm font-bold text-neutral-200">
                            {ex.name}
                          </h4>
                        </div>

                        {/* Exercise Notes */}
                        {ex.notes && (
                          <p className="text-[11px] text-neutral-400 font-mono mb-4 ml-0 sm:ml-9">
                            {ex.notes}
                          </p>
                        )}

                        {/* Sets Table */}
                        {validSets.length > 0 && (
                          <div className="ml-0 sm:ml-9 mt-4">
                            <div className="flex items-center text-[9px] font-mono text-neutral-500 uppercase tracking-wider mb-2 px-1">
                              <div className="w-8">Set</div>
                              <div className="flex-1 text-center">
                                KG / Dist
                              </div>
                              <div className="flex-1 text-center mx-2">
                                Reps / Time
                              </div>
                              <div className="flex-1 text-center">RIR</div>
                            </div>

                            <div className="space-y-1.5">
                              {validSets.map((s: any, sIdx: number) => {
                                // Handle cardio vs weights gracefully
                                const isCardio =
                                  s.distance_km != null ||
                                  s.duration_minutes != null;
                                let primary = '-';
                                let secondary = '-';

                                if (isCardio) {
                                  primary =
                                    s.distance_km != null
                                      ? `${s.distance_km}km`
                                      : '-';
                                  secondary =
                                    s.duration_minutes != null
                                      ? `${s.duration_minutes}m`
                                      : '-';
                                } else {
                                  primary =
                                    s.weight_kg != null
                                      ? s.weight_kg
                                      : event.event_type === 'routine_shared'
                                        ? 'target'
                                        : '-';
                                  secondary = s.reps != null ? s.reps : '-';
                                }

                                const rir = s.rir != null ? s.rir : '-';

                                return (
                                  <div
                                    key={sIdx}
                                    className="flex items-center text-[11px] font-mono text-neutral-300"
                                  >
                                    <div className="w-8 text-neutral-500 font-bold pl-1">
                                      {s.set || sIdx + 1}
                                    </div>

                                    {/* Input-style mock cells */}
                                    <div className="flex-1 bg-neutral-950 border border-neutral-800/80 rounded-md py-1.5 text-center truncate px-1">
                                      {primary}
                                    </div>
                                    <div className="flex-1 mx-2 bg-neutral-950 border border-neutral-800/80 rounded-md py-1.5 text-center truncate px-1">
                                      {secondary}
                                    </div>
                                    <div className="flex-1 bg-neutral-950 border border-neutral-800/80 rounded-md py-1.5 text-center truncate px-1">
                                      {rir}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
          </div>
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

        <button
          onClick={handleCopy}
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
              setShowDeleteConfirm(true);
            }}
            className="flex items-center gap-1.5 text-xs font-mono text-neutral-500 hover:text-rose-500 transition-colors"
            title="Delete Post"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {/* Mounted only when opened, so a page of cards is not a page of
          comment requests */}
      {showComments && (
        <FeedComments eventId={event.id} onCountChange={handleCountChange} />
      )}

      {/* Custom Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={(e) => e.stopPropagation()} // Prevent clicking through to the card
        >
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-white mb-2">Delete Post?</h3>
            <p className="text-sm text-neutral-400 mb-6">
              This action cannot be undone. Are you sure you want to remove this
              from your feed?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm bg-neutral-800 text-white hover:bg-neutral-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm bg-rose-600 text-white hover:bg-rose-500 shadow-lg shadow-rose-900/20 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
