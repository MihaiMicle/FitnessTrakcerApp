'use client';

import { useEffect, useRef, useState } from 'react';
import { Trash2, X } from 'lucide-react';
import { useCopilot } from '@/lib/context/CopilotContext';
import { panelAnchor, panelSize, type Point } from '@/lib/copilot/position';
import { remainingFromLog, type MealTotals } from '@/lib/copilot/meals';
import { getDailyLog } from '@/lib/api';
import { onCopilotChange } from '@/lib/copilot/events';
import CopilotComposer from './CopilotComposer';
import CopilotMessage from './CopilotMessage';

const PROMPTS: Record<string, string[]> = {
  dashboard: [
    'What can I eat with what I have left today?',
    'Estimate my body fat from my photos',
  ],
  workouts: [
    'Build me an upper body routine',
    'Which muscle have I neglected this week?',
  ],
  live_workout: ['What should I do next?', 'Swap this for something easier'],
  settings: ['Recalculate my macros for a lean bulk'],
};

const PLACEHOLDERS: Record<string, string> = {
  live_workout: 'Ask for your next exercise...',
  workouts: 'Ask about your training...',
  settings: 'Ask about your goals...',
  dashboard: 'Ask about food, training or progress...',
};

export default function CopilotPanel({ bubble }: { bubble: Point }) {
  const copilot = useCopilot();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [remaining, setRemaining] = useState<MealTotals | null>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const read = () =>
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    read();
    window.addEventListener('resize', read);
    return () => window.removeEventListener('resize', read);
  }, []);

  /* The remaining macros are read here, not passed down, because the panel can
     be open over the workouts page where no daily log is in scope */
  useEffect(() => {
    let cancelled = false;
    const load = () => {
      getDailyLog(copilot.logDate)
        .then((log) => {
          if (!cancelled) setRemaining(remainingFromLog(log as never));
        })
        .catch(() => undefined);
    };

    load();
    const unsubscribe = onCopilotChange('nutrition', load);

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [copilot.logDate]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [copilot.messages, copilot.loading]);

  if (!viewport.width) return null;

  const size = panelSize(viewport);
  const anchor = panelAnchor(bubble, viewport);
  const prompts = PROMPTS[copilot.surface] ?? PROMPTS.dashboard;

  return (
    <div
      role="dialog"
      aria-label="Fitness copilot"
      style={{
        left: anchor.x,
        top: anchor.y,
        width: size.width,
        height: size.height,
      }}
      className="fixed z-[120] bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl flex flex-col overflow-hidden"
    >
      <header className="p-3 border-b border-neutral-800 flex justify-between items-center font-mono text-xs text-emerald-400 font-bold bg-neutral-950">
        <span className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          COPILOT
          {copilot.surface === 'live_workout' && (
            <span className="text-indigo-400 font-normal">· in workout</span>
          )}
        </span>
        <span className="flex items-center gap-1">
          {copilot.messages.length > 0 && (
            <button
              onClick={copilot.clearThread}
              aria-label="Clear conversation"
              className="text-neutral-500 hover:text-white p-1.5 rounded transition-colors"
            >
              <Trash2 size={14} />
            </button>
          )}
          <button
            onClick={copilot.close}
            aria-label="Close copilot"
            className="text-neutral-500 hover:text-white p-1.5 rounded transition-colors"
          >
            <X size={16} />
          </button>
        </span>
      </header>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar"
      >
        {copilot.messages.length === 0 && (
          <div className="space-y-2 mt-2">
            <p className="text-xs text-neutral-500 font-mono text-center mb-3">
              I can see your logs, your training and your photos.
            </p>
            {prompts.map((prompt) => (
              <button
                key={prompt}
                onClick={() => copilot.send(prompt, [])}
                className="w-full text-left text-xs text-neutral-300 bg-neutral-950 border border-neutral-800 hover:border-emerald-500/40 hover:text-emerald-400 rounded-lg px-3 py-2.5 transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        {copilot.messages.map((message) => (
          <CopilotMessage
            key={message.id}
            message={message}
            remaining={remaining}
            canAddToWorkout={copilot.hasLiveWorkout}
            onLogMeal={copilot.logMeal}
            onSaveRoutine={copilot.saveRoutine}
            onAddExercises={copilot.addToLiveWorkout}
            onApplyAction={copilot.applyAction}
            onSaveBodyFat={copilot.saveBodyFat}
          />
        ))}

        {copilot.loading && (
          <div className="text-xs text-emerald-500/70 font-mono animate-pulse flex gap-1 items-center">
            <span>●</span>
            <span>●</span>
            <span>●</span>
          </div>
        )}
      </div>

      <CopilotComposer
        loading={copilot.loading}
        onSend={copilot.send}
        placeholder={PLACEHOLDERS[copilot.surface] ?? PLACEHOLDERS.dashboard}
      />
    </div>
  );
}
