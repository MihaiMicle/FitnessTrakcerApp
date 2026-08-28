'use client';

import { useState, useEffect } from 'react';
import { X, Search } from 'lucide-react';
import ExerciseBrowser from './ExerciseBrowser';
import ExerciseCreateForm from './ExerciseCreateForm';
import ExerciseProfileView from './ExerciseProfileView';
import { useExerciseLibrary, ExerciseDraft } from './hooks/useExerciseLibrary';

interface ExerciseLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const EMPTY_DRAFT: ExerciseDraft = {
  name: '',
  equipment: 'Dumbbell',
  primary_muscle: 'Chest',
  secondary_muscles: [],
  tracking_type: 'weight_reps',
};

export default function ExerciseLibraryModal({
  isOpen,
  onClose,
}: ExerciseLibraryModalProps) {
  // Pass 'null' to load ALL exercises regardless of strength/cardio
  const library = useExerciseLibrary(isOpen, null);

  const [view, setView] = useState<'browser' | 'create' | 'profile'>('browser');
  const [selectedExercise, setSelectedExercise] = useState<any>(null);
  const [draft, setDraft] = useState<ExerciseDraft>(EMPTY_DRAFT);

  useEffect(() => {
    if (isOpen) {
      setView('browser');
      setSelectedExercise(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreate = async () => {
    const created = await library.create(draft);
    if (created) {
      setSelectedExercise(created);
      setView('profile');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/90 backdrop-blur-md p-0 sm:p-4">
      <div className="bg-neutral-900 border-t sm:border border-neutral-800 rounded-t-2xl sm:rounded-xl w-full max-w-md h-[90vh] sm:h-[700px] flex flex-col shadow-2xl animate-in slide-in-from-bottom-8 sm:zoom-in-95 overflow-hidden">
        {view === 'browser' && (
          <>
            <div className="flex items-center justify-between p-4 border-b border-neutral-800 shrink-0">
              <h3 className="font-bold font-mono tracking-wider text-white">
                EXERCISE LIBRARY
              </h3>
              <button
                onClick={onClose}
                className="text-neutral-500 hover:text-white transition"
              >
                <X size={24} />
              </button>
            </div>

            <ExerciseBrowser
              type={'strength'}
              library={library}
              onSelect={(ex) => {
                setSelectedExercise(ex);
                setView('profile');
              }}
              onCreateNew={() => {
                setDraft((prev) => ({ ...prev, name: library.search.trim() }));
                setView('create');
              }}
            />
          </>
        )}

        {view === 'create' && (
          <>
            <div className="flex items-center justify-between p-4 border-b border-neutral-800 shrink-0">
              <button
                onClick={() => setView('browser')}
                className="text-neutral-500 hover:text-white transition text-xs font-mono uppercase"
              >
                Back
              </button>
              <h3 className="font-bold font-mono tracking-wider text-white">
                CREATE EXERCISE
              </h3>
              <div className="w-8" />
            </div>
            <ExerciseCreateForm
              draft={draft}
              onChange={(patch) => setDraft((prev) => ({ ...prev, ...patch }))}
              isCreating={library.isCreating}
              onSubmit={handleCreate}
            />
          </>
        )}

        {view === 'profile' && selectedExercise && (
          <ExerciseProfileView
            exercise={selectedExercise}
            onBack={() => setView('browser')}
          />
        )}
      </div>
    </div>
  );
}
