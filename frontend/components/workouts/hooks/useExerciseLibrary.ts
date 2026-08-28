'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  DEFAULT_TRACKING_FIELDS,
  TRACKING_TYPES,
} from '@/lib/workouts/constants';
import { supabase } from '@/lib/supabase';

export type ExerciseType = 'strength' | 'cardio';

export interface ExerciseDraft {
  name: string;
  equipment: string;
  primary_muscle: string;
  secondary_muscles: string[];
  tracking_type: string;
}

const exercisesUrl = () =>
  `${process.env.NEXT_PUBLIC_API_URL}/workouts/exercises`;

/** Loads the exercise database, applies the search/filter state, and creates new entries. */
export function useExerciseLibrary(isOpen: boolean, type: ExerciseType | null) {
  const [exercises, setExercises] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [muscle, setMuscle] = useState('All');
  const [equipment, setEquipment] = useState('All');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setSearch('');
    setMuscle('All');
    setEquipment('All');

    const fetchExercises = async () => {
      setLoading(true);
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) return;

        const res = await fetch(exercisesUrl(), {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok) setExercises(await res.json());
      } catch {
        toast.error('Failed to load exercises');
      } finally {
        setLoading(false);
      }
    };

    fetchExercises();
  }, [isOpen]);

  const filtered = useMemo(() => {
    const query = search.toLowerCase().trim();
    return exercises.filter((ex) => {
      if (type !== null && ex.type !== type) return false;
      if (!ex.name.toLowerCase().includes(query)) return false;

      const matchesMuscle =
        muscle === 'All' ||
        ex.primary_muscle === muscle ||
        ex.secondary_muscles?.includes(muscle);

      if (!matchesMuscle) return false;
      return equipment === 'All' || ex.equipment === equipment;
    });
  }, [exercises, type, search, muscle, equipment]);

  const hasExactMatch = useMemo(() => {
    const query = search.toLowerCase().trim();
    return filtered.some((ex) => ex.name.toLowerCase() === query);
  }, [filtered, search]);

  const create = useCallback(
    async (draft: ExerciseDraft): Promise<any | null> => {
      if (!draft.name.trim()) {
        toast.error('Exercise name is required');
        return null;
      }

      setIsCreating(true);
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) return null;

        const tracking = TRACKING_TYPES.find(
          (t) => t.id === draft.tracking_type,
        );

        const res = await fetch(exercisesUrl(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            name: draft.name.trim(),
            type: type || 'strength',
            equipment: draft.equipment,
            primary_muscle: draft.primary_muscle,
            secondary_muscles: draft.secondary_muscles,
            tracking_fields: tracking?.fields ?? DEFAULT_TRACKING_FIELDS,
          }),
        });

        if (!res.ok) {
          toast.error('Failed to create exercise');
          return null;
        }

        const created = await res.json();
        setExercises((prev) => [...prev, created]);
        toast.success(`${created.name} created!`);
        return created;
      } catch {
        toast.error('Network error');
        return null;
      } finally {
        setIsCreating(false);
      }
    },
    [type],
  );

  return {
    loading,
    filtered,
    hasExactMatch,
    search,
    setSearch,
    muscle,
    setMuscle,
    equipment,
    setEquipment,
    isCreating,
    create,
  };
}

export type ExerciseLibrary = ReturnType<typeof useExerciseLibrary>;
