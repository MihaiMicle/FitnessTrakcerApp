'use client';

import { describeFeedSet } from '@/lib/feed/events';
import type { FeedEventItem } from '@/types/feed';

interface FeedExercisesListProps {
  exercises: any[];
  eventType: FeedEventItem['event_type'];
}

/* Exercises for Workouts/Routines, each with its own sets table */
export default function FeedExercisesList({
  exercises,
  eventType,
}: FeedExercisesListProps) {
  if (!Array.isArray(exercises) || exercises.length === 0) return null;

  return (
    <div className="space-y-4 mb-3 mt-4 last:mb-0">
      {exercises.map((ex: any, idx: number) => {
        const sets = ex.sets || [];

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
              <h4 className="text-sm font-bold text-neutral-200">{ex.name}</h4>
            </div>

            {/* Exercise Notes */}
            {ex.notes && (
              <p className="text-[11px] text-neutral-400 font-mono mb-4 ml-0 sm:ml-9">
                {ex.notes}
              </p>
            )}

            {/* Sets Table */}
            {sets.length > 0 && (
              <div className="ml-0 sm:ml-9 mt-4">
                <div className="flex items-center text-[9px] font-mono text-neutral-500 uppercase tracking-wider mb-2 px-1">
                  <div className="w-8">Set</div>
                  <div className="flex-1 text-center">KG / Dist</div>
                  <div className="flex-1 text-center mx-2">Reps / Time</div>
                  <div className="flex-1 text-center">RIR</div>
                </div>

                <div className="space-y-1.5">
                  {sets.map((s: any, sIdx: number) => {
                    const { primary, secondary, rir } = describeFeedSet(
                      s,
                      eventType,
                    );

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
  );
}
