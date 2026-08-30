'use client';

import { X } from 'lucide-react';
import ModalShell from './ModalShell';

interface DayWorkoutsModalProps {
  date: string;
  sessions: any[];
  onSelect: (session: any) => void;
  onClose: () => void;
}

/* Sessions logged on one calendar day, opened from the calendar widget */
export default function DayWorkoutsModal({
  date,
  sessions,
  onSelect,
  onClose,
}: DayWorkoutsModalProps) {
  return (
    <ModalShell spacing="tight">
      <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
        <h3 className="text-lg font-bold text-white tracking-tight">
          {new Date(date).toLocaleDateString(undefined, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          })}
        </h3>
        <button onClick={onClose} className="text-neutral-500 hover:text-white">
          <X size={20} />
        </button>
      </div>

      <div className="space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar pr-1">
        {sessions.map((s) => (
          <div
            key={s.id}
            onClick={() => onSelect(s)}
            className="bg-neutral-950 border border-neutral-800 hover:border-indigo-500/50 rounded-xl p-4 cursor-pointer transition-all group"
          >
            <h4 className="font-bold text-indigo-300 group-hover:text-indigo-200 transition-colors">
              {s.name}
            </h4>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] text-neutral-500 font-mono">
                {s.exercises?.length || 0} exercises
              </span>
              <span className="text-[10px] text-neutral-500 font-mono">
                • {Math.floor(s.duration_seconds / 60)}m
              </span>
            </div>
          </div>
        ))}
      </div>
    </ModalShell>
  );
}
