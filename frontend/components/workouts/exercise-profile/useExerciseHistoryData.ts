'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { ExerciseHistorySet } from '@/lib/workouts/exerciseHistory';

/* Fetches a single exercise's history and the viewer's profile in parallel,
   the two things the profile view needs and nothing it doesn't */
export function useExerciseHistoryData(exerciseName: string) {
  const [history, setHistory] = useState<ExerciseHistorySet[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const [historyRes, profileRes] = await Promise.all([
        fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/workouts/exercises/${encodeURIComponent(exerciseName)}/history`,
          { headers: { Authorization: `Bearer ${session.access_token}` } },
        ),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/profile/me`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }),
      ]);

      if (historyRes.ok) setHistory(await historyRes.json());
      if (profileRes.ok) setProfile(await profileRes.json());
      setLoading(false);
    };

    fetchData();
  }, [exerciseName]);

  return { history, profile, loading };
}
