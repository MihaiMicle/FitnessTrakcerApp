'use client';

import { History } from 'lucide-react';
import { groupHistoryByDate, type ExerciseHistorySet } from '@/lib/workouts/exerciseHistory';

interface ExerciseHistoryListProps {
  history: ExerciseHistorySet[];
  loading: boolean;
}

export default function ExerciseHistoryList({
  history,
  loading,
}: ExerciseHistoryListProps) {
  const groupedHistory = groupHistoryByDate(history);

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <History size={16} className="text-emerald-400" />
        <h3 className="font-bold text-white text-sm tracking-tight uppercase">
          Past Performances
        </h3>
      </div>

      {loading ? (
        <p className="text-xs text-neutral-500 font-mono animate-pulse">
          Loading history...
        </p>
      ) : history.length === 0 ? (
        <p className="text-xs text-neutral-500 font-mono p-4 border border-dashed border-neutral-800 rounded-lg text-center">
          No past records found.
        </p>
      ) : (
        <div className="space-y-4">
          {Object.keys(groupedHistory)
            .sort((a, b) => new Date(b).getTime() - new Date(a).getTime()) // Sort dates newest first
            .map((dateKey) => {
              const sets = groupedHistory[dateKey];
              const displayDate = new Date(dateKey).toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              });
              return (
                <div
                  key={dateKey}
                  className="bg-neutral-950 border border-neutral-800 rounded-xl p-3"
                >
                  <h4 className="text-xs font-bold text-indigo-300 mb-2 border-b border-neutral-800/50 pb-1">
                    {displayDate}
                  </h4>
                  <div className="space-y-1">
                    {sets.map((set: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex justify-between items-center text-xs font-mono"
                      >
                        <span className="text-neutral-500">
                          Set {set.set_number}
                        </span>
                        <div className="text-neutral-300">
                          {set.weight_kg && `${set.weight_kg}kg `}
                          {set.reps && `x ${set.reps} reps `}
                          {set.duration_minutes && `${set.duration_minutes}m `}
                          {set.distance_km && `${set.distance_km}km `}
                          {set.rir != null && (
                            <span className="text-neutral-600">
                              (RIR {set.rir})
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
