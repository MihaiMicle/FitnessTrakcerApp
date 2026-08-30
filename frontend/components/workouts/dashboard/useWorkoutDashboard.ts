'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { useSyncStatus } from '@/hooks/useSyncStatus';

/*
 * Everything the dashboard reads and deletes. Loading is a single round of
 * four parallel requests, and it only reruns once the sync queue has drained,
 * so a locally finished workout is not refetched away before it reaches the
 * server
 */
export function useWorkoutDashboard() {
  const router = useRouter();
  const { pending, syncing } = useSyncStatus();

  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [exerciseDict, setExerciseDict] = useState<Record<string, string>>({});
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return router.replace('/login');

      const headers = { Authorization: `Bearer ${session.access_token}` };
      const api = process.env.NEXT_PUBLIC_API_URL;

      const [historyRes, templatesRes, profileRes, exercisesRes] =
        await Promise.all([
          fetch(`${api}/workouts/`, { headers }),
          fetch(`${api}/workouts/templates`, { headers }),
          fetch(`${api}/profile/me`, { headers }),
          fetch(`${api}/workouts/exercises`, { headers }),
        ]);

      if (historyRes.ok) {
        const all = await historyRes.json();
        setSessions(all.filter((s: any) => s.status === 'completed'));
      }
      if (templatesRes.ok) setTemplates(await templatesRes.json());
      if (profileRes.ok) setProfile(await profileRes.json());

      if (exercisesRes.ok) {
        const data = await exercisesRes.json();
        const dict: Record<string, string> = {};
        for (const ex of data) {
          if (ex.primary_muscle) dict[ex.name] = ex.primary_muscle;
        }
        setExerciseDict(dict);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (pending === 0 && !syncing) fetchAll();
  }, [pending, syncing, fetchAll]);

  const authedRequest = async (path: string, init: RequestInit) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return null;

    return fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
      ...init,
      headers: {
        ...(init.headers || {}),
        Authorization: `Bearer ${session.access_token}`,
      },
    });
  };

  const deleteSession = async (id: string) => {
    setIsDeleting(true);
    try {
      const res = await authedRequest(`/workouts/${id}`, { method: 'DELETE' });
      if (res?.ok) {
        setSessions((prev) => prev.filter((s) => s.id !== id));
        toast.success('Workout deleted!');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setIsDeleting(false);
    }
  };

  const deleteTemplate = async (id: string) => {
    setIsDeleting(true);
    try {
      const res = await authedRequest(`/workouts/templates/${id}`, {
        method: 'DELETE',
      });
      if (res?.ok) {
        setTemplates((prev) => prev.filter((t) => t.id !== id));
        toast.success('Routine deleted');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setIsDeleting(false);
    }
  };

  const updateSessionDuration = async (id: string, seconds: number) => {
    try {
      const res = await authedRequest(`/workouts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duration_seconds: seconds }),
      });
      if (res?.ok) {
        toast.success('Duration updated!');
        fetchAll();
      }
    } catch {
      toast.error('Failed to update time');
    }
  };

  return {
    loading,
    sessions,
    templates,
    profile,
    exerciseDict,
    isDeleting,
    refetch: fetchAll,
    deleteSession,
    deleteTemplate,
    updateSessionDuration,
  };
}
