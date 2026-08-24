'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ChevronLeft, Dumbbell, Play, Trash2, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import LiveWorkout from '@/components/workouts/LiveWorkout';

export default function WorkoutsDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [activeSession, setActiveSession] = useState<any | null>(null);

  // Custom Modal States
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return router.replace('/login');

      const activeRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/workouts/active`,
        {
          headers: { Authorization: `Bearer ${session.access_token}` },
        },
      );

      if (activeRes.ok) setActiveSession(await activeRes.json());
      else setActiveSession(null);

      const historyRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/workouts/`,
        {
          headers: { Authorization: `Bearer ${session.access_token}` },
        },
      );
      if (historyRes.ok) {
        const allSessions = await historyRes.json();
        setSessions(allSessions.filter((s: any) => s.status === 'completed'));
      }

      // Fetch Routines
      const templatesRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/workouts/templates`,
        {
          headers: { Authorization: `Bearer ${session.access_token}` },
        },
      );
      if (templatesRes.ok) setTemplates(await templatesRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const startEmptyWorkout = () => startWorkout('New Workout', []);

  const startWorkoutFromTemplate = (template: any) =>
    startWorkout(template.name, template.exercises);

  const startWorkout = async (name: string, exercises: any[]) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const payload = {
        name,
        status: 'in_progress',
        start_time: new Date().toISOString(),
        duration_seconds: 0,
        exercises,
      };

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/workouts/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setActiveSession(await res.json());
        toast.success('Session started!');
      }
    } catch (err) {
      toast.error('Failed to start workout');
    }
  };

  const confirmDeleteSession = async () => {
    if (!sessionToDelete) return;
    setIsDeleting(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/workouts/${sessionToDelete}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${session.access_token}` },
        },
      );

      if (res.ok) {
        setSessions(sessions.filter((s) => s.id !== sessionToDelete));
        toast.success('Workout deleted!');
      }
    } catch (err) {
      toast.error('Network error.');
    } finally {
      setIsDeleting(false);
      setSessionToDelete(null);
    }
  };

  const confirmDeleteTemplate = async () => {
    if (!templateToDelete) return;
    setIsDeleting(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/workouts/templates/${templateToDelete}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${session.access_token}` },
        },
      );

      if (res.ok) {
        setTemplates(templates.filter((t) => t.id !== templateToDelete));
        toast.success('Routine deleted');
      }
    } catch (err) {
      toast.error('Network error');
    } finally {
      setIsDeleting(false);
      setTemplateToDelete(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 p-8 text-neutral-500 font-mono text-center animate-pulse">
        Loading Session Data...
      </div>
    );
  }

  if (activeSession) {
    return (
      <LiveWorkout
        sessionData={activeSession}
        onClose={() => {
          setActiveSession(null);
          fetchSessions();
        }}
      />
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 p-4 sm:p-6 md:p-12 pb-24 relative">
      <div className="max-w-3xl mx-auto space-y-8">
        <header className="border-b border-neutral-800 pb-6">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => router.push('/')}
              className="text-neutral-500 hover:text-white transition-colors"
            >
              <ChevronLeft size={24} />
            </button>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-indigo-400">
              Training Log
            </h1>
          </div>

          <button
            onClick={startEmptyWorkout}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-900/20 transition-all active:scale-95 flex justify-center items-center gap-2 font-mono text-sm tracking-widest"
          >
            <Play size={18} fill="currentColor" />
            START EMPTY WORKOUT
          </button>
        </header>

        {/* My Rroutines */}
        <div className="space-y-4">
          <h2 className="text-xs font-mono text-neutral-500 tracking-wider">
            MY ROUTINES
          </h2>

          {templates.length === 0 ? (
            <div className="py-8 flex flex-col items-center justify-center border-2 border-dashed border-neutral-800 rounded-2xl bg-neutral-900/20">
              <BookOpen size={32} className="text-neutral-700 mb-3" />
              <p className="text-neutral-500 font-mono text-[11px] sm:text-xs text-center px-4">
                No routines saved yet.
                <br />
                Build one in an empty workout and click "Save Routine".
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {templates.map((t) => (
                <div
                  key={t.id}
                  className="bg-neutral-900 border border-neutral-800 hover:border-indigo-500/50 rounded-xl p-4 sm:p-5 transition-colors group flex flex-col"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-white text-lg truncate pr-2">
                      {t.name}
                    </h3>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setTemplateToDelete(t.id);
                      }}
                      className="text-neutral-600 hover:text-rose-500 transition-colors opacity-100 sm:opacity-0 group-hover:opacity-100 shrink-0"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  <p className="text-xs text-neutral-500 font-mono mb-4 flex-1">
                    {t.exercises.length} exercises
                  </p>
                  <button
                    onClick={() => startWorkoutFromTemplate(t)}
                    className="w-full bg-indigo-500/10 text-indigo-400 hover:bg-indigo-600 hover:text-white font-mono text-[10px] sm:text-xs font-bold py-2.5 rounded-lg transition-colors active:scale-95"
                  >
                    START ROUTINE
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Past Sessions */}
        <div className="space-y-4 pt-4 border-t border-neutral-800/50">
          <h2 className="text-xs font-mono text-neutral-500 tracking-wider">
            PAST SESSIONS
          </h2>

          {sessions.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center border-2 border-dashed border-neutral-800 rounded-2xl bg-neutral-900/20">
              <Dumbbell size={48} className="text-neutral-800 mb-4" />
              <p className="text-neutral-500 font-mono text-sm">
                No completed workouts yet.
              </p>
            </div>
          ) : (
            sessions.map((s) => (
              <div
                key={s.id}
                onClick={() => setActiveSession(s)}
                className="bg-neutral-900 border border-neutral-800 hover:border-indigo-500/50 rounded-xl p-4 sm:p-5 transition-colors cursor-pointer group flex justify-between items-center"
              >
                <div>
                  <div className="flex items-start mb-1.5">
                    <h3 className="font-bold text-white text-lg">{s.name}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-neutral-400 bg-neutral-950 px-2 py-0.5 rounded border border-neutral-800">
                      {new Date(s.start_time).toLocaleDateString()}
                    </span>
                    <span className="text-[10px] text-neutral-500 font-mono">
                      {s.exercises?.length || 0} exercises •{' '}
                      {Math.floor(s.duration_seconds / 60)}m
                    </span>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSessionToDelete(s.id);
                  }}
                  className="text-neutral-600 hover:text-rose-500 p-3 -mr-2 transition-colors opacity-100 sm:opacity-0 group-hover:opacity-100"
                  title="Delete Workout"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Delete Past Session Modal */}
      {sessionToDelete && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-sm w-full p-6 space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="space-y-2 text-center">
              <div className="w-12 h-12 rounded-full bg-rose-500/20 mx-auto flex items-center justify-center mb-4">
                <Trash2 size={24} className="text-rose-500" />
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight">
                Delete Workout?
              </h3>
              <p className="text-neutral-400 text-sm font-mono leading-relaxed">
                This action cannot be undone. All sets and records from this
                session will be permanently lost.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setSessionToDelete(null)}
                disabled={isDeleting}
                className="flex-1 py-3 px-4 bg-neutral-800 hover:bg-neutral-700 text-white font-mono text-xs font-bold rounded-xl transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteSession}
                disabled={isDeleting}
                className="flex-1 py-3 px-4 bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Routine/Template Modal */}
      {templateToDelete && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-sm w-full p-6 space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="space-y-2 text-center">
              <div className="w-12 h-12 rounded-full bg-rose-500/20 mx-auto flex items-center justify-center mb-4">
                <Trash2 size={24} className="text-rose-500" />
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight">
                Delete Routine?
              </h3>
              <p className="text-neutral-400 text-sm font-mono leading-relaxed">
                Are you sure you want to permanently delete this workout
                routine?
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setTemplateToDelete(null)}
                disabled={isDeleting}
                className="flex-1 py-3 px-4 bg-neutral-800 hover:bg-neutral-700 text-white font-mono text-xs font-bold rounded-xl transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteTemplate}
                disabled={isDeleting}
                className="flex-1 py-3 px-4 bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
