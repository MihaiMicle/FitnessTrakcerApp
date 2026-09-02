'use client';

import { useState } from 'react';
import { CheckCircle2, Lock, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';

interface CompleteDayButtonProps {
  selectedDate: string;
  isCompleted: boolean;
  onToggle: (isCompleted: boolean) => Promise<any>;
}

export default function CompleteDayButton({
  selectedDate,
  isCompleted,
  onToggle,
}: CompleteDayButtonProps) {
  const [busy, setBusy] = useState(false);
  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  const handleToggle = async () => {
    setBusy(true);
    const targetState = !isCompleted;
    try {
      await onToggle(targetState);
      if (targetState) {
        toast.success(
          isToday
            ? '🎉 Day completed! Great work today.'
            : 'Day marked as completed.',
        );
      } else {
        toast.success('Diary reopened for edits.');
      }
    } catch {
      toast.error('Could not update status. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-full pt-4 pb-8 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-neutral-800/80 mt-6">
      <div className="flex items-center gap-2">
        <span
          className={`w-2.5 h-2.5 rounded-full ${
            isCompleted
              ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]'
              : 'bg-amber-400'
          }`}
        />
        <span className="text-xs font-mono text-neutral-400">
          Status:{' '}
          <strong
            className={isCompleted ? 'text-emerald-400' : 'text-neutral-200'}
          >
            {isCompleted ? 'Completed' : 'In Progress'}
          </strong>
        </span>
      </div>

      <button
        onClick={handleToggle}
        disabled={busy}
        className={`w-full sm:w-auto px-6 py-3 rounded-xl font-mono text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 ${
          isCompleted
            ? 'bg-neutral-900 border border-neutral-700 hover:border-neutral-500 text-neutral-300 hover:text-white'
            : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20'
        }`}
      >
        {isCompleted ? (
          <>
            <RotateCcw size={15} />
            REOPEN DIARY FOR EDITS
          </>
        ) : (
          <>
            <CheckCircle2 size={16} />
            COMPLETE DAY
          </>
        )}
      </button>
    </div>
  );
}
