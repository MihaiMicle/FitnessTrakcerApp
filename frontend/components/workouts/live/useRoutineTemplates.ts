'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { asRoutineExercises, type WorkoutExercise } from '@/lib/workouts/sets';

/*
 * Saving the open session as a reusable routine. The template list is fetched
 * so the finish dialog can tell whether this session came from a routine, and
 * offer to update that one rather than always creating a duplicate
 */
export function useRoutineTemplates(enabled: boolean, workoutName: string) {
  const [templates, setTemplates] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const fetchTemplates = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/workouts/templates`,
        { headers: { Authorization: `Bearer ${session.access_token}` } },
      );
      if (res.ok) setTemplates(await res.json());
    };

    fetchTemplates();
  }, [enabled]);

  const matchedTemplate = templates.find((t) => t.name === workoutName);

  const saveAsRoutine = useCallback(
    async (exercises: WorkoutExercise[], templateIdToUpdate?: string) => {
      if (exercises.length === 0) {
        toast.error('Add exercises before saving a routine');
        return false;
      }

      toast.loading('Saving routine...', { id: 'routine' });
      setIsSaving(true);

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) return false;

        const base = `${process.env.NEXT_PUBLIC_API_URL}/workouts/templates`;
        const res = await fetch(
          templateIdToUpdate ? `${base}/${templateIdToUpdate}` : base,
          {
            method: templateIdToUpdate ? 'PUT' : 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              name: workoutName,
              exercises: asRoutineExercises(exercises),
            }),
          },
        );

        if (!res.ok) {
          toast.error('Failed to save routine', { id: 'routine' });
          return false;
        }
        toast.success(`Routine '${workoutName}' saved!`, { id: 'routine' });
        return true;
      } catch {
        toast.error('Network error', { id: 'routine' });
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [workoutName],
  );

  return { templates, matchedTemplate, saveAsRoutine, isSaving, setIsSaving };
}
