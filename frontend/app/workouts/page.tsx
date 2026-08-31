'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, ChevronLeft, Play, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import RoutineEditor from '@/components/workouts/RoutineEditor';
import WorkoutCalendar from '@/components/workouts/WorkoutCalendar';
import ExerciseLibraryModal from '@/components/workouts/ExerciseLibraryModal';
import MuscleDistribution from '@/components/workouts/MuscleDistribution';
import MuscleRankPalette from '@/components/workouts/MuscleRankPalette';
import WidgetStack from '@/components/workouts/WidgetStack';
import ConfirmDeleteModal from '@/components/workouts/dashboard/ConfirmDeleteModal';
import DayWorkoutsModal from '@/components/workouts/dashboard/DayWorkoutsModal';
import EditDurationModal from '@/components/workouts/dashboard/EditDurationModal';
import RoutineList from '@/components/workouts/dashboard/RoutineList';
import SessionList from '@/components/workouts/dashboard/SessionList';
import { useWorkoutDashboard } from '@/components/workouts/dashboard/useWorkoutDashboard';
import { useWorkout } from '@/lib/context/WorkoutContext';
import { newLocalSession } from '@/lib/offline/draft';
import { queueSessionSave } from '@/lib/offline/manager';
import CardioAnalytics from '@/components/workouts/CardioAnalytics';

const ACTION_BUTTON =
  'flex-1 font-bold py-4 rounded-xl shadow-lg transition-all active:scale-95 flex justify-center items-center gap-2 font-mono text-sm tracking-widest';

export default function WorkoutsDashboard() {
  const router = useRouter();
  const { startWorkout } = useWorkout();
  const dashboard = useWorkoutDashboard();

  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isRoutineEditorOpen, setIsRoutineEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any | null>(null);

  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);
  const [editTimeSession, setEditTimeSession] = useState<any | null>(null);
  const [selectedDay, setSelectedDay] = useState<{
    date: string;
    sessions: any[];
  } | null>(null);

  /*
   * Start now, upload later
   *
   * The session id is generated on the device, so the workout is real to the
   * app before any request is made and the first set can be logged with no
   * signal. The queued PUT creates the row server side when it gets through
   */
  const handleStartWorkout = (name: string, exercises: any[]) => {
    const newSession = newLocalSession(name, exercises, Date.now());
    startWorkout(newSession);
    queueSessionSave(newSession.id as string, { ...newSession });
    toast.success('Session started!');
  };

  const closeRoutineEditor = () => {
    setIsRoutineEditorOpen(false);
    setEditingTemplate(null);
  };

  if (dashboard.loading) {
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
        onClose={closeRoutineEditor}
        onSaved={() => {
          closeRoutineEditor();
          dashboard.refetch();
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
              onClick={() => handleStartWorkout('New Workout', [])}
              className={`${ACTION_BUTTON} bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-900/20`}
            >
              <Play size={18} fill="currentColor" />
              START EMPTY WORKOUT
            </button>
            <button
              onClick={() => setIsRoutineEditorOpen(true)}
              className={`${ACTION_BUTTON} bg-neutral-800 hover:bg-neutral-700 text-indigo-400 border border-neutral-700 hover:border-indigo-500/50`}
            >
              <Plus size={18} strokeWidth={3} />
              CREATE ROUTINE
            </button>
            <button
              onClick={() => setIsLibraryOpen(true)}
              className={`${ACTION_BUTTON} bg-neutral-800 hover:bg-neutral-700 text-emerald-400 border border-neutral-700 hover:border-emerald-500/50`}
            >
              <BookOpen size={18} strokeWidth={3} />
              LIBRARY
            </button>
          </div>
        </header>

        <div className="space-y-4">
          <h2 className="text-xs font-mono text-neutral-500 tracking-wider">
            MY ROUTINES
          </h2>
          <RoutineList
            templates={dashboard.templates}
            onStart={(t) => handleStartWorkout(t.name, t.exercises)}
            onEdit={(t) => {
              setEditingTemplate(t);
              setIsRoutineEditorOpen(true);
            }}
            onDelete={setTemplateToDelete}
          />
        </div>

        <div className="space-y-4 pt-4 border-t border-neutral-800/50">
          <h2 className="text-xs font-mono text-neutral-500 tracking-wider">
            ANALYTICS &amp; CALENDAR
          </h2>

          <WidgetStack>
            <WorkoutCalendar
              sessions={dashboard.sessions}
              onDayClick={(date, daySessions) =>
                setSelectedDay({ date, sessions: daySessions })
              }
            />

            <MuscleDistribution sessions={dashboard.sessions} />

            <MuscleRankPalette
              sessions={dashboard.sessions}
              exerciseDict={dashboard.exerciseDict}
              profile={dashboard.profile}
            />

            <CardioAnalytics sessions={dashboard.sessions} />
          </WidgetStack>
        </div>

        <div className="space-y-4 pt-4 border-t border-neutral-800/50">
          <h2 className="text-xs font-mono text-neutral-500 tracking-wider">
            PAST SESSIONS
          </h2>
          <SessionList
            sessions={dashboard.sessions}
            onOpen={startWorkout}
            onEditDuration={setEditTimeSession}
            onDelete={setSessionToDelete}
          />
        </div>
      </div>

      {editTimeSession && (
        <EditDurationModal
          initialSeconds={editTimeSession.duration_seconds || 0}
          onCancel={() => setEditTimeSession(null)}
          onSave={(seconds) => {
            dashboard.updateSessionDuration(editTimeSession.id, seconds);
            setEditTimeSession(null);
          }}
        />
      )}

      {sessionToDelete && (
        <ConfirmDeleteModal
          title="Delete Workout?"
          message="This action cannot be undone. All sets and records from this session will be permanently lost."
          isDeleting={dashboard.isDeleting}
          onCancel={() => setSessionToDelete(null)}
          onConfirm={async () => {
            await dashboard.deleteSession(sessionToDelete);
            setSessionToDelete(null);
          }}
        />
      )}

      {templateToDelete && (
        <ConfirmDeleteModal
          title="Delete Routine?"
          message="Are you sure you want to permanently delete this workout routine?"
          isDeleting={dashboard.isDeleting}
          onCancel={() => setTemplateToDelete(null)}
          onConfirm={async () => {
            await dashboard.deleteTemplate(templateToDelete);
            setTemplateToDelete(null);
          }}
        />
      )}

      {selectedDay && (
        <DayWorkoutsModal
          date={selectedDay.date}
          sessions={selectedDay.sessions}
          onClose={() => setSelectedDay(null)}
          onSelect={(s) => {
            setSelectedDay(null);
            startWorkout(s);
          }}
        />
      )}

      <ExerciseLibraryModal
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
      />
    </main>
  );
}
