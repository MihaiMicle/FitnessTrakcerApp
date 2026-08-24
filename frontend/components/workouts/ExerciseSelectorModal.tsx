'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Search,
  Plus,
  Dumbbell,
  Activity,
  ChevronLeft,
  Filter,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface ExerciseSelectorModalProps {
  isOpen: boolean;
  type: 'strength' | 'cardio' | null;
  onClose: () => void;
  onSelect: (exercise: any) => void;
}

const MUSCLES = [
  'Chest',
  'Anterior Delt',
  'Lateral Delt',
  'Posterior Delt',
  'Lats',
  'Mid Back',
  'Traps',
  'Triceps',
  'Biceps',
  'Quads',
  'Hamstrings',
  'Calves',
  'Abs',
  'Forearms',
  'Adductor',
  'Abductor',
  'Neck',
  'Lower Back',
  'Brachialis',
];

const EQUIPMENT = [
  'None',
  'Barbell',
  'Dumbbell',
  'Kettlebell',
  'Machine',
  'Plate',
  'Resistance Band',
  'Suspension Band',
  'Other',
];

const TRACKING_TYPES = [
  {
    id: 'weight_reps',
    label: 'Weight & Reps',
    example: 'Bench Press, Curls',
    fields: ['weight', 'reps', 'rir'],
  },
  {
    id: 'bw_reps',
    label: 'Bodyweight Reps',
    example: 'Pullups, Sit ups',
    fields: ['reps', 'rir'],
  },
  {
    id: 'weighted_bw',
    label: 'Weighted Bodyweight',
    example: 'Weighted Dips',
    fields: ['weight', 'reps', 'rir'],
  },
  {
    id: 'assisted_bw',
    label: 'Assisted Bodyweight',
    example: 'Assisted Pullups',
    fields: ['weight', 'reps', 'rir'],
  },
  {
    id: 'duration',
    label: 'Duration',
    example: 'Planks, Stretching',
    fields: ['time'],
  },
  {
    id: 'duration_weight',
    label: 'Duration & Weight',
    example: 'Weighted Plank',
    fields: ['weight', 'time'],
  },
  {
    id: 'distance_duration',
    label: 'Distance & Duration',
    example: 'Running, Cycling',
    fields: ['distance', 'time'],
  },
  {
    id: 'weight_distance',
    label: 'Weight & Distance',
    example: 'Farmers Walk',
    fields: ['weight', 'distance'],
  },
];

export default function ExerciseSelectorModal({
  isOpen,
  type,
  onClose,
  onSelect,
}: ExerciseSelectorModalProps) {
  const [exercises, setExercises] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Filtering State
  const [filterMuscle, setFilterMuscle] = useState<string>('All');
  const [filterEquipment, setFilterEquipment] = useState<string>('All');

  // Creation Form State
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    equipment: 'Dumbbell',
    primary_muscle: 'Chest',
    secondary_muscles: [] as string[],
    tracking_type: 'weight_reps',
  });

  useEffect(() => {
    if (isOpen) {
      fetchExercises();
      setSearch('');
      setFilterMuscle('All');
      setFilterEquipment('All');
      setShowCreateForm(false);
    }
  }, [isOpen]);

  const fetchExercises = async () => {
    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/workouts/exercises`,
        {
          headers: { Authorization: `Bearer ${session.access_token}` },
        },
      );

      if (res.ok) setExercises(await res.json());
    } catch (err) {
      toast.error('Failed to load exercises');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setFormData((prev) => ({
      ...prev,
      name: search.trim(),
      tracking_type: type === 'cardio' ? 'distance_duration' : 'weight_reps',
      // Smart pre-fill: If they are filtering, assume they want to create that type of exercise
      equipment: filterEquipment !== 'All' ? filterEquipment : 'Dumbbell',
      primary_muscle: filterMuscle !== 'All' ? filterMuscle : 'Chest',
    }));
    setShowCreateForm(true);
  };

  const toggleSecondaryMuscle = (muscle: string) => {
    setFormData((prev) => ({
      ...prev,
      secondary_muscles: prev.secondary_muscles.includes(muscle)
        ? prev.secondary_muscles.filter((m) => m !== muscle)
        : [...prev.secondary_muscles, muscle],
    }));
  };

  const handleCreateSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('Exercise name is required');
      return;
    }

    setIsCreating(true);

    const selectedTracking = TRACKING_TYPES.find(
      (t) => t.id === formData.tracking_type,
    );
    const tracking_fields = selectedTracking
      ? selectedTracking.fields
      : ['weight', 'reps'];

    const payload = {
      name: formData.name.trim(),
      type: type || 'strength',
      equipment: formData.equipment,
      primary_muscle: formData.primary_muscle,
      secondary_muscles: formData.secondary_muscles,
      tracking_fields: tracking_fields,
    };

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/workouts/exercises`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(payload),
        },
      );

      if (res.ok) {
        const newEx = await res.json();
        setExercises([...exercises, newEx]);
        toast.success(`${newEx.name} created!`);
        onSelect(newEx);
      } else {
        toast.error('Failed to create exercise');
      }
    } catch (err) {
      toast.error('Network error');
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen || !type) return null;

  // Multi-layered filtering logic
  const filtered = exercises.filter((ex) => {
    const matchesType = ex.type === type;
    const matchesSearch = ex.name
      .toLowerCase()
      .includes(search.toLowerCase().trim());

    // Check primary OR secondary muscles
    const matchesMuscle =
      filterMuscle === 'All' ||
      ex.primary_muscle === filterMuscle ||
      (ex.secondary_muscles && ex.secondary_muscles.includes(filterMuscle));

    const matchesEq =
      filterEquipment === 'All' || ex.equipment === filterEquipment;

    return matchesType && matchesSearch && matchesMuscle && matchesEq;
  });

  const exactMatch = filtered.some(
    (ex) => ex.name.toLowerCase() === search.toLowerCase().trim(),
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/90 backdrop-blur-md p-0 sm:p-4">
      <div className="bg-neutral-900 border-t sm:border border-neutral-800 rounded-t-2xl sm:rounded-xl w-full max-w-md h-[90vh] sm:h-[700px] flex flex-col shadow-2xl animate-in slide-in-from-bottom-8 sm:zoom-in-95">
        {/* Header */}
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

        {/* --- VIEW 1: SEARCH, FILTER & LIST --- */}
        {!showCreateForm ? (
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
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={`Search database...`}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-9 pr-3 py-3 text-sm text-white focus:border-indigo-500 outline-none transition-colors font-mono"
                />
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex gap-2 px-4 pb-3 border-b border-neutral-800/50 shrink-0 overflow-x-auto custom-scrollbar">
              <div className="relative shrink-0">
                <select
                  value={filterMuscle}
                  onChange={(e) => setFilterMuscle(e.target.value)}
                  className="bg-neutral-950 border border-neutral-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-neutral-300 outline-none focus:border-indigo-500 cursor-pointer appearance-none font-mono"
                >
                  <option value="All">All Muscles</option>
                  {MUSCLES.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <Filter
                  size={12}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none"
                />
              </div>

              <div className="relative shrink-0">
                <select
                  value={filterEquipment}
                  onChange={(e) => setFilterEquipment(e.target.value)}
                  className="bg-neutral-950 border border-neutral-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-neutral-300 outline-none focus:border-indigo-500 cursor-pointer appearance-none font-mono"
                >
                  <option value="All">All Equipment</option>
                  {EQUIPMENT.map((eq) => (
                    <option key={eq} value={eq}>
                      {eq}
                    </option>
                  ))}
                </select>
                <Filter
                  size={12}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
              {loading ? (
                <div className="p-8 text-center text-xs font-mono text-neutral-500 animate-pulse">
                  Loading database...
                </div>
              ) : (
                <div className="space-y-1">
                  {filtered.map((ex) => (
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
                      {type === 'strength' ? (
                        <Dumbbell size={16} className="text-neutral-600" />
                      ) : (
                        <Activity size={16} className="text-neutral-600" />
                      )}
                    </button>
                  ))}

                  {search.trim() && !exactMatch && (
                    <button
                      onClick={handleOpenCreate}
                      className="w-full mt-2 p-4 rounded-xl border-2 border-dashed border-indigo-500/30 hover:border-indigo-500/80 bg-indigo-500/5 hover:bg-indigo-500/10 transition-colors flex items-center gap-3 text-left"
                    >
                      <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                        <Plus size={16} />
                      </div>
                      <div>
                        <h4 className="font-bold text-indigo-300 text-sm">
                          Create "{search.trim()}"
                        </h4>
                        <span className="text-[10px] font-mono text-indigo-500/70">
                          Add custom exercise to database
                        </span>
                      </div>
                    </button>
                  )}

                  {!search.trim() && filtered.length === 0 && (
                    <div className="p-8 text-center text-xs font-mono text-neutral-500">
                      No exercises found matching these filters.
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          /* --- VIEW 2: CREATION FORM --- */
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar flex flex-col gap-6">
            <div>
              <label className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider mb-1.5 block">
                Exercise Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-sm text-white focus:border-indigo-500 outline-none transition-colors font-mono"
              />
            </div>

            <div>
              <label className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider mb-1.5 block">
                Tracking Style
              </label>
              <select
                value={formData.tracking_type}
                onChange={(e) =>
                  setFormData({ ...formData, tracking_type: e.target.value })
                }
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-sm text-white focus:border-indigo-500 outline-none transition-colors cursor-pointer appearance-none"
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
                <label className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider mb-1.5 block">
                  Equipment
                </label>
                <select
                  value={formData.equipment}
                  onChange={(e) =>
                    setFormData({ ...formData, equipment: e.target.value })
                  }
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-sm text-white focus:border-indigo-500 outline-none transition-colors cursor-pointer appearance-none"
                >
                  {EQUIPMENT.map((eq) => (
                    <option key={eq} value={eq}>
                      {eq}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider mb-1.5 block">
                  Primary Muscle
                </label>
                <select
                  value={formData.primary_muscle}
                  onChange={(e) =>
                    setFormData({ ...formData, primary_muscle: e.target.value })
                  }
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-sm text-white focus:border-indigo-500 outline-none transition-colors cursor-pointer appearance-none"
                >
                  {MUSCLES.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider mb-2 block">
                Secondary Muscles
              </label>
              <div className="flex flex-wrap gap-2">
                {MUSCLES.map((m) => {
                  const isSelected = formData.secondary_muscles.includes(m);
                  return (
                    <button
                      key={`sec-${m}`}
                      onClick={() => toggleSecondaryMuscle(m)}
                      className={`px-3 py-1.5 rounded-full text-[10px] font-mono font-bold transition-all border ${
                        isSelected
                          ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-500 hover:border-neutral-600'
                      }`}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-auto pt-6">
              <button
                onClick={handleCreateSubmit}
                disabled={isCreating || !formData.name.trim()}
                className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold tracking-wide shadow-lg shadow-indigo-900/20 transition-all active:scale-95 disabled:opacity-50"
              >
                {isCreating ? 'Saving...' : 'Save Exercise'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
