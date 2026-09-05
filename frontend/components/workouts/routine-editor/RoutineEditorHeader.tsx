'use client';

import { ChevronLeft, Globe, Lock, Save, Users } from 'lucide-react';
import { VISIBILITY_OPTIONS } from '@/lib/social/visibility';
import type { Visibility } from '@/types/social';

interface RoutineEditorHeaderProps {
  name: string;
  onNameChange: (name: string) => void;
  visibility: Visibility;
  onVisibilityChange: (visibility: Visibility) => void;
  isReordering: boolean;
  onToggleReordering: () => void;
  onClose: () => void;
  onSave: () => void;
  isSaving: boolean;
}

const VISIBILITY_ICONS: Record<Visibility, typeof Globe> = {
  public: Globe,
  followers: Users,
  private: Lock,
};

export default function RoutineEditorHeader({
  name,
  onNameChange,
  visibility,
  onVisibilityChange,
  isReordering,
  onToggleReordering,
  onClose,
  onSave,
  isSaving,
}: RoutineEditorHeaderProps) {
  return (
    <div className="sticky top-0 z-40 bg-neutral-950/80 backdrop-blur-md border-b border-neutral-800 p-4 sm:px-6">
      <div className="max-w-3xl mx-auto flex justify-between items-center">
        <div className="flex items-center gap-2 sm:gap-4 flex-1">
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-white transition-colors shrink-0"
          >
            <ChevronLeft size={28} />
          </button>
          <div className="flex flex-col flex-1 min-w-0">
            <input
              type="text"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              className="bg-transparent text-lg sm:text-xl font-bold text-white outline-none focus:border-b focus:border-indigo-500 placeholder:text-neutral-600 w-full truncate"
              placeholder="Routine Name"
            />
            <div className="flex items-center gap-2 mt-1">
              <div className="flex bg-neutral-900 rounded border border-neutral-800 p-0.5">
                {VISIBILITY_OPTIONS.map((opt) => {
                  const Icon = VISIBILITY_ICONS[opt.value];
                  return (
                    <button
                      key={opt.value}
                      onClick={() => onVisibilityChange(opt.value)}
                      className={`px-2 py-1 flex items-center gap-1.5 rounded text-[10px] font-mono transition-colors ${
                        visibility === opt.value
                          ? 'bg-indigo-500 text-white'
                          : 'text-neutral-500 hover:text-white'
                      }`}
                      title={opt.label}
                    >
                      <Icon size={12} />
                      <span className="hidden sm:inline">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
              <button
                onClick={onToggleReordering}
                className={`ml-1 px-2 py-1 rounded text-[10px] sm:text-xs transition-colors font-mono ${isReordering ? 'bg-indigo-500 text-white' : 'bg-neutral-800 text-neutral-300 hover:text-white'}`}
              >
                {isReordering ? 'Done' : 'Reorder'}
              </button>
            </div>
          </div>
        </div>
        <button
          onClick={onSave}
          disabled={isSaving}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-4 sm:px-6 rounded-lg transition-colors font-mono text-xs active:scale-95 ml-3 flex items-center gap-2"
        >
          <Save size={16} /> <span className="hidden sm:inline">Save</span>
        </button>
      </div>
    </div>
  );
}
