'use client';

import { Check } from 'lucide-react';

export type FinishAction = 'update' | 'save_new' | 'skip';

interface FinishWorkoutModalProps {
  /* The routine this session was started from, when there is one */
  matchedTemplate: any | null;
  isSaving: boolean;
  onFinish: (action: FinishAction) => void;
  onCancel: () => void;
}

const BUTTON =
  'w-full py-3 px-4 font-mono text-xs font-bold rounded-xl transition-colors disabled:opacity-50';

export default function FinishWorkoutModal({
  matchedTemplate,
  isSaving,
  onFinish,
  onCancel,
}: FinishWorkoutModalProps) {
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-sm w-full p-6 space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="space-y-2 text-center">
          <div className="w-12 h-12 rounded-full bg-indigo-500/20 mx-auto flex items-center justify-center mb-4">
            <Check size={24} className="text-indigo-500" />
          </div>
          <h3 className="text-xl font-bold text-white tracking-tight">
            Workout Complete!
          </h3>
          <p className="text-neutral-400 text-sm font-mono leading-relaxed">
            {matchedTemplate
              ? `You started this from your "${matchedTemplate.name}" routine. Would you like to update the routine with today's changes?`
              : 'Would you like to save this session as a reusable routine?'}
          </p>
        </div>

        <div className="flex flex-col gap-3 pt-2">
          {matchedTemplate && (
            <button
              onClick={() => onFinish('update')}
              disabled={isSaving}
              className={`${BUTTON} bg-indigo-600 hover:bg-indigo-500 text-white`}
            >
              Update &quot;{matchedTemplate.name}&quot;
            </button>
          )}

          <button
            onClick={() => onFinish('save_new')}
            disabled={isSaving}
            className={
              matchedTemplate
                ? `${BUTTON} bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700`
                : `${BUTTON} bg-indigo-600 hover:bg-indigo-500 text-white`
            }
          >
            {matchedTemplate ? 'Save as New Routine' : 'Save as Routine'}
          </button>

          <button
            onClick={() => onFinish('skip')}
            disabled={isSaving}
            className={`${BUTTON} bg-neutral-800 hover:bg-neutral-700 text-neutral-400 border border-neutral-700`}
          >
            No, Just Finish
          </button>
          <button
            onClick={onCancel}
            disabled={isSaving}
            className={`${BUTTON} bg-transparent text-neutral-500 hover:text-white`}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
