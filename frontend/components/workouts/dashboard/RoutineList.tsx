'use client';

import { BookOpen, Pencil, Trash2 } from 'lucide-react';

interface RoutineListProps {
  templates: any[];
  onStart: (template: any) => void;
  onEdit: (template: any) => void;
  onDelete: (templateId: string) => void;
}

export default function RoutineList({
  templates,
  onStart,
  onEdit,
  onDelete,
}: RoutineListProps) {
  if (templates.length === 0) {
    return (
      <div className="py-8 flex flex-col items-center justify-center border-2 border-dashed border-neutral-800 rounded-2xl bg-neutral-900/20">
        <BookOpen size={32} className="text-neutral-700 mb-3" />
        <p className="text-neutral-500 font-mono text-[11px] sm:text-xs text-center px-4">
          No routines saved yet.
          <br />
          Build one in an empty workout and click &quot;Save Routine&quot;.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {templates.map((t) => (
        <div
          key={t.id}
          className="bg-neutral-900 border border-neutral-800 hover:border-indigo-500/50 rounded-xl p-4 sm:p-5 transition-colors group flex flex-col"
        >
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-bold text-white text-lg truncate pr-2">
              {t.name}
            </h3>
            {/* Always visible on touch, revealed on hover with a pointer */}
            <div className="flex gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <button
                onClick={() => onEdit(t)}
                className="text-neutral-600 hover:text-blue-400 transition-colors"
                title="Edit Routine"
              >
                <Pencil size={18} />
              </button>
              <button
                onClick={() => onDelete(t.id)}
                className="text-neutral-600 hover:text-rose-500 transition-colors"
                title="Delete Routine"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>

          <p className="text-xs text-neutral-500 font-mono mb-4 flex-1">
            {t.exercises.length} exercises
          </p>
          <button
            onClick={() => onStart(t)}
            className="w-full bg-indigo-500/10 text-indigo-400 hover:bg-indigo-600 hover:text-white font-mono text-[10px] sm:text-xs font-bold py-2.5 rounded-lg transition-colors active:scale-95"
          >
            START ROUTINE
          </button>
        </div>
      ))}
    </div>
  );
}
