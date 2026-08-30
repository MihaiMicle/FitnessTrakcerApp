'use client';

import { Clock, Dumbbell, Trash2 } from 'lucide-react';
import { sessionTotals } from '@/lib/workouts/session';

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
                onClick={(e) => {
                  /* The card opens the session, these buttons must not */
                  e.stopPropagation();
                  onEditDuration(s);
                }}
                className="text-neutral-600 hover:text-indigo-400 p-2 transition-colors"
                title="Edit Duration"
              >
                <Clock size={20} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
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
