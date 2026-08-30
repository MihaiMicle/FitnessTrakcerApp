'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  chooseActiveWorkout,
  isDraft,
  makeDraft,
  type WorkoutDraft,
} from '@/lib/offline/draft';
import { DRAFT_KEY, readJson, writeJson } from '@/lib/offline/storage';

interface RestoreOptions {
  onRestore: (session: any) => void;
}

/*
 * Picks up whichever workout is newer, the local draft or the one the server
 * thinks is active. The local copy is applied first so a returning tab shows
 * something immediately, then the server answer replaces it only if it wins
 */
export function useSessionRestore({ onRestore }: RestoreOptions) {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const restore = async () => {
      const stored = readJson<unknown>(DRAFT_KEY, null);
      const draft: WorkoutDraft | null = isDraft(stored) ? stored : null;

      const local = chooseActiveWorkout(draft, null, Date.now());
      if (local && !cancelled) onRestore(local);

      let server: any = null;
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session) {
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/workouts/active`,
            { headers: { Authorization: `Bearer ${session.access_token}` } },
          );
          if (res.ok) server = await res.json();
        }
      } catch {
        /* No signal means the local draft is the best answer available */
      }

      const resolved = chooseActiveWorkout(draft, server, Date.now());
      if (resolved && resolved.id !== local?.id && !cancelled) {
        onRestore(resolved);
      }
      if (!cancelled) setHydrated(true);
    };

    restore();
    return () => {
      cancelled = true;
    };
    /* Runs once on mount, onRestore is captured deliberately */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return hydrated;
}

interface PersistArgs {
  hydrated: boolean;
  session: any | null;
  name: string;
  exercises: any[];
}

/* Mirrors the open workout to localStorage on every edit, so closing the tab
   mid set loses nothing. Completed sessions are left alone, they belong to the
   sync queue by then */
export function useSessionPersist({
  hydrated,
  session,
  name,
  exercises,
}: PersistArgs) {
  useEffect(() => {
    if (!hydrated || !session?.id) return;
    if (session.status === 'completed') return;

    writeJson(
      DRAFT_KEY,
      makeDraft(
        {
          sessionId: session.id,
          name,
          startTime: session.start_time,
          exercises,
        },
        Date.now(),
      ),
    );
  }, [hydrated, session, name, exercises]);
}
