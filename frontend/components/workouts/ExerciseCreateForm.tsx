'use client';

import { EQUIPMENT, MUSCLES, TRACKING_TYPES } from '@/lib/workouts/constants';
import { ExerciseDraft } from './hooks/useExerciseLibrary';

const FIELD_CLASS =
  'w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-sm text-white focus:border-indigo-500 outline-none transition-colors';
const SELECT_CLASS = `${FIELD_CLASS} cursor-pointer appearance-none`;

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider mb-1.5 block">
      {children}
    </label>
  );
}

function OptionSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={SELECT_CLASS}
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

interface ExerciseCreateFormProps {
  draft: ExerciseDraft;
  onChange: (patch: Partial<ExerciseDraft>) => void;
  isCreating: boolean;
  onSubmit: () => void;
}

export default function ExerciseCreateForm({
  draft,
  onChange,
  isCreating,
  onSubmit,
}: ExerciseCreateFormProps) {
  const toggleSecondary = (muscle: string) =>
    onChange({
      secondary_muscles: draft.secondary_muscles.includes(muscle)
        ? draft.secondary_muscles.filter((m) => m !== muscle)
        : [...draft.secondary_muscles, muscle],
    });

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar flex flex-col gap-6">
      <div>
        <Label>Exercise Name</Label>
        <input
          type="text"
          value={draft.name}
          onChange={(e) => onChange({ name: e.target.value })}
          className={`${FIELD_CLASS} font-mono`}
        />
      </div>

      <div>
        <Label>Tracking Style</Label>
        <select
          value={draft.tracking_type}
          onChange={(e) => onChange({ tracking_type: e.target.value })}
          className={SELECT_CLASS}
        >
          {TRACKING_TYPES.map((tt) => (
            <option key={tt.id} value={tt.id}>
              {tt.label} (e.g. {tt.example})
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Equipment</Label>
          <OptionSelect
            value={draft.equipment}
            onChange={(equipment) => onChange({ equipment })}
            options={EQUIPMENT}
          />
        </div>
        <div>
          <Label>Primary Muscle</Label>
          <OptionSelect
            value={draft.primary_muscle}
            onChange={(primary_muscle) => onChange({ primary_muscle })}
            options={MUSCLES}
          />
        </div>
      </div>

      <div>
        <Label>Secondary Muscles</Label>
        <div className="flex flex-wrap gap-2">
          {MUSCLES.map((muscle) => {
            const isSelected = draft.secondary_muscles.includes(muscle);
            return (
              <button
                key={`sec-${muscle}`}
                onClick={() => toggleSecondary(muscle)}
                className={`px-3 py-1.5 rounded-full text-[10px] font-mono font-bold transition-all border ${
                  isSelected
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-500 hover:border-neutral-600'
                }`}
              >
                {muscle}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-auto pt-6">
        <button
          onClick={onSubmit}
          disabled={isCreating || !draft.name.trim()}
          className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold tracking-wide shadow-lg shadow-indigo-900/20 transition-all active:scale-95 disabled:opacity-50"
        >
          {isCreating ? 'Saving...' : 'Save Exercise'}
        </button>
      </div>
    </div>
  );
}
