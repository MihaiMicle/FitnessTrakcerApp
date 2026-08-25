'use client';

import { Plus } from 'lucide-react';

type Accent = 'emerald' | 'amber' | 'indigo';

// Full class strings: Tailwind can't see dynamically built names.
const ACCENT: Record<Accent, { card: string; icon: string; title: string; hint: string }> =
  {
    emerald: {
      card: 'border-emerald-500/30 hover:border-emerald-500/80 bg-emerald-500/5 hover:bg-emerald-500/10',
      icon: 'bg-emerald-500/20 text-emerald-400',
      title: 'text-emerald-300',
      hint: 'text-emerald-500/70',
    },
    indigo: {
      card: 'border-indigo-500/30 hover:border-indigo-500/80 bg-indigo-500/5 hover:bg-indigo-500/10',
      icon: 'bg-indigo-500/20 text-indigo-400',
      title: 'text-indigo-300',
      hint: 'text-indigo-500/70',
    },
    amber: {
      card: 'border-amber-500/30 hover:border-amber-500/80 bg-amber-500/5 hover:bg-amber-500/10',
      icon: 'bg-amber-500/20 text-amber-400',
      title: 'text-amber-300',
      hint: 'text-amber-500/70',
    },
  };

interface CreateNewCardProps {
  title: string;
  hint: string;
  accent?: Accent;
  onClick: () => void;
}

/** Dashed "create this instead" card shown when a search finds no exact match. */
export default function CreateNewCard({
  title,
  hint,
  accent = 'emerald',
  onClick,
}: CreateNewCardProps) {
  const styles = ACCENT[accent];

  return (
    <button
      onClick={onClick}
      className={`w-full mt-2 p-4 rounded-xl border-2 border-dashed transition-colors flex items-center gap-3 text-left ${styles.card}`}
    >
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${styles.icon}`}
      >
        <Plus size={16} />
      </div>
      <div>
        <h4 className={`font-bold text-sm ${styles.title}`}>{title}</h4>
        <span className={`text-[10px] font-mono ${styles.hint}`}>{hint}</span>
      </div>
    </button>
  );
}
