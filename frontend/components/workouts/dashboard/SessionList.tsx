'use client';

import { Clock, Dumbbell, Trash2, Share2, Rss } from 'lucide-react';
import { sessionTotals } from '@/lib/workouts/session';
import { nativeShare } from '@/lib/share';
import { postToFeed } from '@/lib/feed/api';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';

interface SessionListProps {
  sessions: any[];
  onOpen: (session: any) => void;
  onEditDuration: (session: any) => void;
  onDelete: (sessionId: string) => void;
}

export default function SessionList({
  sessions,
  onOpen,
  onEditDuration,
  onDelete,
}: SessionListProps) {
  if (sessions.length === 0) {
    return (
      <div className="py-12 flex flex-col items-center justify-center border-2 border-dashed border-neutral-800 rounded-2xl bg-neutral-900/20">
        <Dumbbell size={48} className="text-neutral-800 mb-4" />
        <p className="text-neutral-500 font-mono text-sm">
          No completed workouts yet.
        </p>
      </div>
    );
  }

  return (
    <>
      {sessions.map((s) => {
        const { sets, volume } = sessionTotals(s.exercises || []);

        return (
          <div
            key={s.id}
            onClick={() => onOpen(s)}
            className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 sm:p-5 group flex justify-between items-center cursor-pointer"
          >
            <div>
              <div className="flex items-start mb-1.5">
                <h3 className="font-bold text-white text-lg">{s.name}</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-neutral-400 bg-neutral-950 px-2 py-0.5 rounded border border-neutral-800">
                  {new Date(s.start_time).toLocaleDateString()}
                </span>
                <span className="text-[10px] text-neutral-500 font-mono">
                  {s.exercises?.length || 0} exercises • {sets} sets •{' '}
                  {volume.toLocaleString()} kg •{' '}
                  {Math.floor(s.duration_seconds / 60)}m
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  toast.loading('Fetching details & posting...', {
                    id: 'feed-post',
                  });
                  try {
                    const {
                      data: { session },
                    } = await supabase.auth.getSession();
                    if (!session) throw new Error('No session');

                    // Fetch the full workout session with all exercises and sets
                    const res = await fetch(
                      `${process.env.NEXT_PUBLIC_API_URL}/workouts/sessions/${s.id}`,
                      {
                        headers: {
                          Authorization: `Bearer ${session.access_token}`,
                        },
                      },
                    );
                    const fullSession = await res.json();

                    const { sets, volume } = sessionTotals(
                      fullSession.exercises || [],
                    );

                    // Post the full data to the feed
                    await postToFeed({
                      event_type: 'workout',
                      subject_id: `${s.id}-${Date.now()}`,
                      title: s.name,
                      payload: {
                        duration_seconds: s.duration_seconds,
                        exercise_count: fullSession.exercises?.length || 0,
                        set_count: sets,
                        total_volume_kg: volume,
                        exercises: fullSession.exercises || [],
                      },
                    });
                    toast.success('Posted to feed!', { id: 'feed-post' });
                  } catch (err) {
                    console.error(err);
                    toast.error('Failed to post', { id: 'feed-post' });
                  }
                }}
                className="text-neutral-600 hover:text-sky-400 p-2 transition-colors"
                title="Post to Feed"
              >
                <Rss size={20} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const { sets, volume } = sessionTotals(s.exercises || []);
                  const mins = Math.floor(s.duration_seconds / 60);

                  let exerciseText = '';
                  if (s.exercises && s.exercises.length > 0) {
                    exerciseText =
                      '\n\nWorkout Details:\n' +
                      s.exercises
                        .map((ex: any) => {
                          const setLines = (ex.sets || [])
                            .filter((set: any) => set.completed)
                            .map((set: any, idx: number) => {
                              const mainParts = [];
                              if (set.weight_kg)
                                mainParts.push(`${set.weight_kg}kg`);
                              if (set.reps) mainParts.push(`${set.reps} reps`);

                              let setString = mainParts.join(' x ');

                              const extras = [];
                              if (set.distance_km)
                                extras.push(`${set.distance_km}km`);
                              if (set.duration_minutes)
                                extras.push(`${set.duration_minutes}m`);
                              if (set.rir != null)
                                extras.push(`RIR ${set.rir}`);

                              if (extras.length > 0) {
                                setString +=
                                  (setString ? ' ' : '') +
                                  `(${extras.join(', ')})`;
                              }

                              return `    Set ${set.set || idx + 1}: ${setString || 'Done'}`;
                            });
                          return `  • ${ex.name}\n${setLines.join('\n')}`;
                        })
                        .join('\n\n');
                  }

                  const text = `Just crushed a workout on FitnessTracker! \n${s.name} - ${s.exercises?.length || 0} exercises, ${sets} sets, ${volume.toLocaleString()} kg volume in ${mins}m.${exerciseText}`;
                  nativeShare('Workout Complete', text);
                }}
                className="text-neutral-600 hover:text-emerald-400 p-2 transition-colors"
                title="Share Workout"
              >
                <Share2 size={20} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  <div className="flex items-center gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity"></div>;
                  onDelete(s.id);
                }}
                className="text-neutral-600 hover:text-rose-500 p-2 transition-colors"
                title="Delete Workout"
              >
                <Trash2 size={20} />
              </button>
            </div>
          </div>
        );
      })}
    </>
  );
}
