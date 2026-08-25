'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import ExerciseBrowser from './ExerciseBrowser';
import ExerciseCreateForm from './ExerciseCreateForm';
import {
  ExerciseDraft,
  ExerciseType,
  useExerciseLibrary,
} from './hooks/useExerciseLibrary';

interface ExerciseSelectorModalProps {
  isOpen: boolean;
  type: ExerciseType | null;
  onClose: () => void;
  onSelect: (exercise: any) => void;
}

const EMPTY_DRAFT: ExerciseDraft = {
  name: '',
  equipment: 'Dumbbell',
  primary_muscle: 'Chest',
  secondary_muscles: [],
  tracking_type: 'weight_reps',
};

export default function ExerciseSelectorModal({
  isOpen,
  type,
  onClose,
  onSelect,
}: ExerciseSelectorModalProps) {
  const library = useExerciseLibrary(isOpen, type);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [draft, setDraft] = useState<ExerciseDraft>(EMPTY_DRAFT);

  useEffect(() => {
    if (isOpen) setShowCreateForm(false);
  }, [isOpen]);

  if (!isOpen || !type) return null;

  /** Seeds the form from the search box and the active filters. */
  const openCreateForm = () => {
    setDraft((prev) => ({
      ...prev,
      name: library.search.trim(),
      tracking_type: type === 'cardio' ? 'distance_duration' : 'weight_reps',
      equipment: library.equipment !== 'All' ? library.equipment : 'Dumbbell',
      primary_muscle: library.muscle !== 'All' ? library.muscle : 'Chest',
    }));
    setShowCreateForm(true);
  };

  const handleCreate = async () => {
    const created = await library.create(draft);
    if (created) onSelect(created);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/90 backdrop-blur-md p-0 sm:p-4">
      <div className="bg-neutral-900 border-t sm:border border-neutral-800 rounded-t-2xl sm:rounded-xl w-full max-w-md h-[90vh] sm:h-[700px] flex flex-col shadow-2xl animate-in slide-in-from-bottom-8 sm:zoom-in-95">
        <div className="flex items-center justify-between p-4 border-b border-neutral-800 shrink-0">
          <button
            onClick={() =>
              showCreateForm ? setShowCreateForm(false) : onClose()
            }
            className="text-neutral-500 hover:text-white transition-colors p-1"
          >
            <ChevronLeft size={24} />
          </button>
          <h3 className="font-bold font-mono tracking-wider text-white">
            {showCreateForm ? 'NEW EXERCISE' : `SELECT ${type.toUpperCase()}`}
          </h3>
          <div className="w-8" />
        </div>

        {showCreateForm ? (
          <ExerciseCreateForm
            draft={draft}
            onChange={(patch) => setDraft((prev) => ({ ...prev, ...patch }))}
            isCreating={library.isCreating}
            onSubmit={handleCreate}
          />
        ) : (
          <ExerciseBrowser
            type={type}
            library={library}
            onSelect={onSelect}
            onCreateNew={openCreateForm}
          />
        )}
      </div>
    </div>
  );
}
