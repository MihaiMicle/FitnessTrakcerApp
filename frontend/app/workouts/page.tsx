'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  ChevronLeft,
  Dumbbell,
  Play,
  Trash2,
  BookOpen,
  Plus,
  Pencil,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import RoutineEditor from '@/components/workouts/RoutineEditor';
import { useWorkout } from '@/lib/context/WorkoutContext';
import { useSyncStatus } from '@/hooks/useSyncStatus';
import { newLocalSession } from '@/lib/offline/draft';
import { queueSessionSave } from '@/lib/offline/manager';
import WorkoutCalendar from '@/components/workouts/WorkoutCalendar';
import ExerciseLibraryModal from '@/components/workouts/ExerciseLibraryModal';
import MuscleDistribution from '@/components/workouts/MuscleDistribution';
import WidgetStack from '@/components/workouts/WidgetStack';
import MuscleRankPalette from '@/components/workouts/MuscleRankPalette';

export default function WorkoutsDashboard() {
  const router = useRouter();

  const { startWorkout, activeSession } = useWorkout();
  const { pending, syncing } = useSyncStatus();

  const [exerciseDict, setExerciseDict] = useState<Record<string, string>>({});
  const [profile, setProfile] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);

  const [isLibraryOpen, setIsLibraryOpen] = useState(false);

  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRoutineEditorOpen, setIsRoutineEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any | null>(null);

  const [editTimeSession, setEditTimeSession] = useState<any | null>(null);
  const [newDuration, setNewDuration] = useState(0);

  const [selectedDayWorkouts, setSelectedDayWorkouts] = useState<{
    date: string;
    sessions: any[];
  } | null>(null);

  const fetchSessions = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return router.replace('/login');

      // Fetch Sessions, Routines, Profile, and Exercises concurrently
      const [historyRes, templatesRes, profileRes, exercisesRes] =
        await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/workouts/`, {
            headers: { Authorization: `Bearer ${session.access_token}` },
          }),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/workouts/templates`, {
            headers: { Authorization: `Bearer ${session.access_token}` },
          }),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/profile/me`, {
            headers: { Authorization: `Bearer ${session.access_token}` },
          }),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/workouts/exercises`, {
            headers: { Authorization: `Bearer ${session.access_token}` },
          }),
        ]);

      if (historyRes.ok) {
        const allSessions = await historyRes.json();
        setSessions(allSessions.filter((s: any) => s.status === 'completed'));
      }

      if (templatesRes.ok) setTemplates(await templatesRes.json());

      if (profileRes.ok) {
        setProfile(await profileRes.json());
      }

      if (exercisesRes.ok) {
        const data = await exercisesRes.json();
        const dict: Record<string, string> = {};
        data.forEach((e: any) => {
          if (e.primary_muscle) dict[e.name] = e.primary_muscle;
        });
        setExerciseDict(dict);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (pending === 0 && !syncing) {
      fetchSessions();
    }
  }, [pending, syncing]);

  const startEmptyWorkout = () => handleStartWorkout('New Workout', []);

  const startWorkoutFromTemplate = (template: any) =>
    handleStartWorkout(template.name, template.exercises);

  /*
   * Start now, upload later
   *
   * The session id is generated on the device, so the workout is real to the
   * app before any request is made and the first set can be logged with no
   * signal. The queued PUT creates the row server side when it gets through
   */
  const handleStartWorkout = async (name: string, exercises: any[]) => {
    const newSession = newLocalSession(name, exercises, Date.now());
    startWorkout(newSession);
    queueSessionSave(newSession.id as string, { ...newSession });
    toast.success('Session started!');
  };

  const confirmEditTime = async () => {
    if (!editTimeSession) return;
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/workouts/${editTimeSession.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ duration_seconds: newDuration }),
        },
      );

      if (res.ok) {
        toast.success('Duration updated!');
        fetchSessions();
      }
    } catch (err) {
      toast.error('Failed to update time.');
    } finally {
      setEditTimeSession(null);
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

  if (isRoutineEditorOpen) {
    return (
      <RoutineEditor
        template={editingTemplate}
        onClose={() => {
          setIsRoutineEditorOpen(false);
          setEditingTemplate(null);
        }}
        onSaved={() => {
          setIsRoutineEditorOpen(false);
          setEditingTemplate(null);
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
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={startEmptyWorkout}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-900/20 transition-all active:scale-95 flex justify-center items-center gap-2 font-mono text-sm tracking-widest"
            >
              <Play size={18} fill="currentColor" />
              START EMPTY WORKOUT
            </button>
            <button
              onClick={() => setIsRoutineEditorOpen(true)}
              className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-indigo-400 font-bold py-4 rounded-xl shadow-lg transition-all active:scale-95 flex justify-center items-center gap-2 font-mono text-sm tracking-widest border border-neutral-700 hover:border-indigo-500/50"
            >
              <Plus size={18} strokeWidth={3} />
              CREATE ROUTINE
            </button>
            <button
              onClick={() => setIsLibraryOpen(true)}
              className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-emerald-400 font-bold py-4 rounded-xl shadow-lg transition-all active:scale-95 flex justify-center items-center gap-2 font-mono text-sm tracking-widest border border-neutral-700 hover:border-emerald-500/50"
            >
              <BookOpen size={18} strokeWidth={3} />
              LIBRARY
            </button>
          </div>
        </header>

        {/* My routines */}
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
                    <div className="flex gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingTemplate(t);
                          setIsRoutineEditorOpen(true);
                        }}
                        className="text-neutral-600 hover:text-blue-400 transition-colors"
                        title="Edit Routine"
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setTemplateToDelete(t.id);
                        }}
                        className="text-neutral-600 hover:text-rose-500 transition-colors"
                        title="Delete Routine"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
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

        {/* Analytics & Calendar Stack */}
        <div className="space-y-4 pt-4 border-t border-neutral-800/50">
          <h2 className="text-xs font-mono text-neutral-500 tracking-wider">
            ANALYTICS & CALENDAR
          </h2>

          <WidgetStack>
            {/* Widget 1: Workout Calendar */}
            <WorkoutCalendar
              sessions={sessions}
              onDayClick={(date, daySessions) =>
                setSelectedDayWorkouts({ date, sessions: daySessions })
              }
            />

            {/* Widget 2: Muscle Distribution */}
            <MuscleDistribution sessions={sessions} />

            {/* Widget 3: Muscle Rank Palette */}
            <MuscleRankPalette
              sessions={sessions}
              exerciseDict={exerciseDict}
              profile={profile}
            />
          </WidgetStack>
        </div>

        {/* Past sessions */}
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
            sessions.map((s) => {
              const completedSets =
                s.exercises?.reduce(
                  (acc: number, ex: any) =>
                    acc +
                    (ex.sets?.filter((set: any) => set.completed).length || 0),
                  0,
                ) || 0;
              const totalVolume =
                s.exercises?.reduce(
                  (acc: number, ex: any) =>
                    acc +
                    (ex.sets
                      ?.filter((set: any) => set.completed)
                      .reduce(
                        (sum: number, set: any) =>
                          sum + (set.weight_kg || 0) * (set.reps || 0),
                        0,
                      ) || 0),
                  0,
                ) || 0;

              return (
                <div
                  key={s.id}
                  onClick={() => startWorkout(s)}
                  className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 sm:p-5 group flex justify-between items-center"
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
                        {s.exercises?.length || 0} exercises • {completedSets}{' '}
                        sets • {totalVolume.toLocaleString()} kg •{' '}
                        {Math.floor(s.duration_seconds / 60)}m
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSessionToDelete(s.id);
                      }}
                      className="text-neutral-600 hover:text-rose-500 p-2 transition-colors"
                      title="Delete Workout"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Edit Time Modal */}
      {editTimeSession && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-sm w-full p-6 space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-white text-center tracking-tight">
              Edit Workout Time
            </h3>
            <div className="flex items-center justify-center gap-4">
              <input
                type="number"
                min="0"
                value={Math.floor(newDuration / 60)}
                onChange={(e) => setNewDuration(Number(e.target.value) * 60)}
                className="w-24 bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white text-center text-xl font-mono focus:border-indigo-500 outline-none transition-colors"
              />
              <span className="text-neutral-400 font-mono">minutes</span>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setEditTimeSession(null)}
                className="flex-1 py-3 px-4 bg-neutral-800 hover:bg-neutral-700 text-white font-mono text-xs font-bold rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmEditTime}
                className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold rounded-xl transition-colors"
              >
                Save Time
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete past session modal */}
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

      {/* Calendar Day Workouts Modal */}
      {selectedDayWorkouts && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
              <h3 className="text-lg font-bold text-white tracking-tight">
                {new Date(selectedDayWorkouts.date).toLocaleDateString(
                  undefined,
                  { weekday: 'short', month: 'short', day: 'numeric' },
                )}
              </h3>
              <button
                onClick={() => setSelectedDayWorkouts(null)}
                className="text-neutral-500 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar pr-1">
              {selectedDayWorkouts.sessions.map((s) => (
                <div
                  key={s.id}
                  onClick={() => {
                    setSelectedDayWorkouts(null);
                    startWorkout(s);
                  }}
                  className="bg-neutral-950 border border-neutral-800 hover:border-indigo-500/50 rounded-xl p-4 cursor-pointer transition-all group"
                >
                  <h4 className="font-bold text-indigo-300 group-hover:text-indigo-200 transition-colors">
                    {s.name}
                  </h4>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] text-neutral-500 font-mono">
                      {s.exercises?.length || 0} exercises
                    </span>
                    <span className="text-[10px] text-neutral-500 font-mono">
                      • {Math.floor(s.duration_seconds / 60)}m
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Delete routine/template modal */}
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

      <ExerciseLibraryModal
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
      />
    </main>
  );
}
