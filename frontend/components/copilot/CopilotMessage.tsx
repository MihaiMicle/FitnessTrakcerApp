'use client';

import ReactMarkdown from 'react-markdown';
import type { MealTotals } from '@/lib/copilot/meals';
import { isUsableRoutine } from '@/lib/copilot/routine';
import type {
  CopilotAction,
  CopilotExercise,
  CopilotMeal,
  CopilotMessage,
  CopilotRoutine,
} from '@/lib/copilot/types';
import ActionCard from './cards/ActionCard';
import BodyFatCard from './cards/BodyFatCard';
import ExerciseSuggestion from './cards/ExerciseSuggestion';
import MealSuggestion from './cards/MealSuggestion';
import RoutineSuggestion from './cards/RoutineSuggestion';

const MARKDOWN_COMPONENTS = {
  strong: (props: object) => (
    <strong className="font-bold text-emerald-400" {...props} />
  ),
  em: (props: object) => <em className="italic text-emerald-300" {...props} />,
  ul: (props: object) => (
    <ul className="list-disc pl-5 space-y-1 my-2" {...props} />
  ),
  ol: (props: object) => (
    <ol className="list-decimal pl-5 space-y-1 my-2" {...props} />
  ),
  p: (props: object) => <p className="mb-2 last:mb-0" {...props} />,
};

interface MessageProps {
  message: CopilotMessage;
  remaining: MealTotals | null;
  canAddToWorkout: boolean;
  onLogMeal: (meal: CopilotMeal) => Promise<void>;
  onSaveRoutine: (routine: CopilotRoutine) => Promise<void>;
  onAddExercises: (exercises: CopilotExercise[]) => void;
  onApplyAction: (action: CopilotAction) => Promise<void>;
  onSaveBodyFat: (percent: number) => Promise<void>;
}

export default function CopilotMessage({
  message,
  remaining,
  canAddToWorkout,
  onLogMeal,
  onSaveRoutine,
  onAddExercises,
  onApplyAction,
  onSaveBodyFat,
}: MessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
      {message.images && message.images.length > 0 && (
        <div className="flex gap-1.5 mb-1.5 flex-wrap justify-end">
          {message.images.map((src, index) => (
            <img
              key={index}
              src={src}
              alt=""
              className="w-16 h-16 object-cover rounded-lg border border-neutral-700"
            />
          ))}
        </div>
      )}

      <div
        className={`p-3 rounded-xl text-sm max-w-[92%] shadow-sm leading-relaxed ${
          isUser
            ? 'bg-emerald-600 text-white'
            : message.failed
              ? 'bg-rose-950/40 text-rose-200 border border-rose-900/60'
              : 'bg-neutral-800 text-neutral-200 border border-neutral-700'
        }`}
      >
        <ReactMarkdown components={MARKDOWN_COMPONENTS}>
          {message.message}
        </ReactMarkdown>
      </div>

      <div className="w-full max-w-[92%] space-y-3 mt-2 empty:mt-0">
        {message.action && (
          <ActionCard action={message.action} onApply={onApplyAction} />
        )}

        {message.suggested_meals?.map((meal, index) => (
          <MealSuggestion
            key={`${meal.title}-${index}`}
            meal={meal}
            remaining={remaining}
            onLog={onLogMeal}
          />
        ))}

        {isUsableRoutine(message.suggested_routine) && (
          <RoutineSuggestion
            routine={message.suggested_routine}
            onSave={onSaveRoutine}
          />
        )}

        {message.suggested_exercises &&
          message.suggested_exercises.length > 0 && (
            <ExerciseSuggestion
              exercises={message.suggested_exercises}
              canAdd={canAddToWorkout}
              onAdd={onAddExercises}
            />
          )}

        {message.body_fat && (
          <BodyFatCard estimate={message.body_fat} onSave={onSaveBodyFat} />
        )}
      </div>
    </div>
  );
}
