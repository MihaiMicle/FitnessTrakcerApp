'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import ExerciseSelectorModal from './ExerciseSelectorModal';
import RestTimerOverlay from './RestTimerOverlay';
import ConfirmModal from '@/components/shared/ConfirmModal';
import { useConfirm } from '@/components/shared/useConfirm';
import { useWorkout } from '@/lib/context/WorkoutContext';
import { isInSuperset, createExerciseEntry } from '@/lib/workouts/sets';
import { sessionTotals } from '@/lib/workouts/session';
import AddExerciseBar from './live/AddExerciseBar';
import FinishWorkoutModal, {
  type FinishAction,
} from './live/FinishWorkoutModal';
import LiveExerciseCard from './live/LiveExerciseCard';
import LiveWorkoutHeader from './live/LiveWorkoutHeader';
import TimerAdjustModal from './live/TimerAdjustModal';
import { useExerciseReorder } from './live/useExerciseReorder';
import { useRoutineTemplates } from './live/useRoutineTemplates';
import { useRouter } from 'next/navigation';


export default function LiveWorkout() {
  const {
    activeSession,
    isMinimized,
    workoutName,
    setWorkoutName,
    exercises,
    setExercises,
    previousSets,
    formattedTime,
    elapsed,
    isTimerPaused,
    toggleTimer,
    overrideTimer,
    minimizeWorkout,
    clearWorkout,
    cancelWorkout,
    addSet,
    updateSet,
    toggleSetComplete,
    updateSetType,
    removeSet,
    removeExercise,
    toggleSuperset,
    saveSession,
    setExerciseRest,
    setSetRest,
  } = useWorkout();

  const confirm = useConfirm();
  const reorder = useExerciseReorder(exercises, setExercises);
  const router = useRouter();

  const isOpen = Boolean(activeSession) && !isMinimized;
  const isCompleted = activeSession?.status === 'completed';

  const { matchedTemplate, saveAsRoutine, isSaving, setIsSaving } =
    useRoutineTemplates(isOpen, workoutName);

  const [selectorType, setSelectorType] = useState<
    'strength' | 'cardio' | null
  >(null);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [openSetMenu, setOpenSetMenu] = useState<{
    exId: string;
    setIndex: number;
  } | null>(null);

  /* The set menu has no backdrop, so a document listener closes it. Clicks
     inside the menu are ignored by the container class check */
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest?.('.set-menu-container')) return;
      setOpenSetMenu(null);
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  if (!isOpen) return null;

  const { sets: completedSets, volume: totalVolume } = sessionTotals(exercises);

  /*
   * Saving the routine is a convenience and still needs the network, the
   * session is the record of the work done. A failed routine save must never
   * block the workout from finishing, or an offline user is stuck on the modal
   */
  const handleFinishWorkout = async (action: FinishAction) => {
    if (action === 'update' && matchedTemplate) {
      await saveAsRoutine(exercises, matchedTemplate.id);
    } else if (action === 'save_new') {
      await saveAsRoutine(exercises);
    }
    await saveSession('completed');
    toast.success('Workout completed!');
    setShowFinishModal(false);
    clearWorkout();
    router.push('/workouts');
  };

  const handleFinishClick = async () => {
    if (!isCompleted) {
      setShowFinishModal(true);
      return;
    }
    setIsSaving(true);
    await saveSession('completed');
    toast.success('Changes saved!');
    setIsSaving(false);
    clearWorkout();
    router.push('/workouts');
  };

  const handleBack = () => {
    if (isCompleted) {
      clearWorkout();
      return;
    }
    saveSession('in_progress');
    minimizeWorkout();
  };

  const handleCancelClick = () => {
    confirm.ask({
      title: 'CANCEL WORKOUT',
      message:
        'Are you sure you want to cancel this workout? All progress will be lost.',
      confirmText: 'Yes, Cancel',
      isDestructive: true,
      action: async () => {
        await cancelWorkout();
      },
    });
  };

  const handleExerciseSelected = (selected: any) => {
    setExercises([...exercises, createExerciseEntry(selected)]);
    setSelectorType(null);
  };

  return (
    <>
      <div className="fixed inset-0 z-[100] bg-neutral-950 text-neutral-100 flex flex-col overflow-y-auto">
        <LiveWorkoutHeader
          workoutName={workoutName}
          onNameChange={setWorkoutName}
          formattedTime={formattedTime}
          isTimerPaused={isTimerPaused}
          completedSets={completedSets}
          totalVolume={totalVolume}
          isReordering={reorder.isReordering}
          isSaving={isSaving}
          isCompleted={isCompleted}
          onBack={handleBack}
          onOpenTimer={() => setShowTimerModal(true)}
          onToggleReorder={reorder.toggleReordering}
          onCancel={handleCancelClick}
          onSaveRoutine={() => saveAsRoutine(exercises, matchedTemplate?.id)}
          onFinish={handleFinishClick}
        />

        <div className="flex-1 max-w-6xl w-full mx-auto p-4 sm:px-6 grid grid-cols-1 md:grid-cols-2 gap-6 pb-32 content-start">
          {exercises.map((ex: any, index: number) => (
            <LiveExerciseCard
              key={ex.id}
              exercise={ex}
              index={index}
              isSuperset={isInSuperset(exercises, index)}
              isLinkedToPrevious={
                Boolean(ex.superset_id) &&
                exercises[index - 1]?.superset_id === ex.superset_id
              }
              previousSets={previousSets[ex.name]}
              isReordering={reorder.isReordering}
              isDragged={reorder.draggedIndex === index}
              isDragTarget={reorder.dragOverIndex === index}
              openSetIndex={
                openSetMenu && openSetMenu.exId === ex.id
                  ? openSetMenu.setIndex
                  : null
              }
              onOpenSetMenu={(setIndex) =>
                setOpenSetMenu(
                  setIndex === null ? null : { exId: ex.id, setIndex },
                )
              }
              onSetExerciseRest={(setType, seconds) =>
                setExerciseRest(ex.id, setType, seconds)
              }
              onToggleSuperset={() => toggleSuperset(index)}
              onRemoveExercise={() => removeExercise(ex.id)}
              onAddSet={() => addSet(ex.id)}
              onUpdateSet={(setIndex, key, value) =>
                updateSet(ex.id, setIndex, key, value)
              }
              onUpdateSetType={(setIndex, type) =>
                updateSetType(ex.id, setIndex, type)
              }
              onSetSetRest={(setIndex, seconds) =>
                setSetRest(ex.id, setIndex, seconds)
              }
              onRemoveSet={(setIndex) => removeSet(ex.id, setIndex)}
              onToggleSetComplete={(setIndex) =>
                toggleSetComplete(ex.id, setIndex)
              }
              onUpdateNotes={(notes) =>
                setExercises(
                  exercises.map((exercise) =>
                    exercise.id === ex.id ? { ...exercise, notes } : exercise,
                  ),
                )
              }
              dragHandlers={reorder}
            />
          ))}
        </div>

        {!reorder.isReordering && <AddExerciseBar onAdd={setSelectorType} />}

        <RestTimerOverlay />

        <ExerciseSelectorModal
          isOpen={selectorType !== null}
          type={selectorType}
          onClose={() => setSelectorType(null)}
          onSelect={handleExerciseSelected}
        />

        {showFinishModal && (
          <FinishWorkoutModal
            matchedTemplate={matchedTemplate}
            isSaving={isSaving}
            onFinish={handleFinishWorkout}
            onCancel={() => setShowFinishModal(false)}
          />
        )}

        {showTimerModal && (
          <TimerAdjustModal
            elapsed={elapsed}
            isPaused={isTimerPaused}
            onOverride={overrideTimer}
            onTogglePause={toggleTimer}
            onClose={() => setShowTimerModal(false)}
          />
        )}
      </div>

      <ConfirmModal {...confirm.modalProps} />
    </>
  );
}
