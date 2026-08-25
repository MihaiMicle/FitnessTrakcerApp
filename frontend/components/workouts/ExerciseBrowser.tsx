'use client';

import { Activity, Dumbbell, Filter, Search } from 'lucide-react';
import CreateNewCard from '@/components/shared/CreateNewCard';
import { EQUIPMENT, MUSCLES } from '@/lib/workouts/constants';
import { ExerciseLibrary, ExerciseType } from './hooks/useExerciseLibrary';

const SELECT_CLASS =
  'bg-neutral-950 border border-neutral-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-neutral-300 outline-none focus:border-indigo-500 cursor-pointer appearance-none font-mono';

function FilterSelect({
  value,
  onChange,
  allLabel,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  allLabel: string;
  options: string[];
}) {
  return (
    <div className="relative shrink-0">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={SELECT_CLASS}
      >
        <option value="All">{allLabel}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <Filter
        size={12}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none"
      />
    </div>
  );
}

interface ExerciseBrowserProps {
  type: ExerciseType;
  library: ExerciseLibrary;
  onSelect: (exercise: any) => void;
  onCreateNew: () => void;
}

export default function ExerciseBrowser({
  type,
  library,
  onSelect,
  onCreateNew,
}: ExerciseBrowserProps) {
  const query = library.search.trim();
  const TypeIcon = type === 'strength' ? Dumbbell : Activity;

  return (
    <>
      <div className="p-4 pb-2 shrink-0">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"
          />
          <input
            type="text"
            autoFocus
            value={library.search}
            onChange={(e) => library.setSearch(e.target.value)}
            placeholder="Search database..."
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-9 pr-3 py-3 text-sm text-white focus:border-indigo-500 outline-none transition-colors font-mono"
          />
        </div>
      </div>

      <div className="flex gap-2 px-4 pb-3 border-b border-neutral-800/50 shrink-0 overflow-x-auto custom-scrollbar">
        <FilterSelect
          value={library.muscle}
          onChange={library.setMuscle}
          allLabel="All Muscles"
          options={MUSCLES}
        />
        <FilterSelect
          value={library.equipment}
          onChange={library.setEquipment}
          allLabel="All Equipment"
          options={EQUIPMENT}
        />
      </div>

      <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
        {library.loading ? (
          <div className="p-8 text-center text-xs font-mono text-neutral-500 animate-pulse">
            Loading database...
          </div>
        ) : (
          <div className="space-y-1">
            {library.filtered.map((ex) => (
              <button
                key={ex.id}
                onClick={() => onSelect(ex)}
                className="w-full text-left p-3 sm:p-4 rounded-xl hover:bg-neutral-800 transition-colors group flex items-center justify-between"
              >
                <div>
                  <h4 className="font-bold text-neutral-200 group-hover:text-indigo-400 transition-colors">
                    {ex.name}
                  </h4>
                  <div className="flex gap-2 mt-1">
                    {ex.primary_muscle && (
                      <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider">
                        {ex.primary_muscle}
                      </span>
                    )}
                    {ex.equipment && (
                      <span className="text-[10px] font-mono text-neutral-600 uppercase tracking-wider">
                        • {ex.equipment}
                      </span>
                    )}
                  </div>
                </div>
                <TypeIcon size={16} className="text-neutral-600" />
              </button>
            ))}

            {query && !library.hasExactMatch && (
              <CreateNewCard
                title={`Create "${query}"`}
                hint="Add custom exercise to database"
                accent="indigo"
                onClick={onCreateNew}
              />
            )}

            {!query && library.filtered.length === 0 && (
              <div className="p-8 text-center text-xs font-mono text-neutral-500">
                No exercises found matching these filters.
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
