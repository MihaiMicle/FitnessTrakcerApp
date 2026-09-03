'use client';

import { useState } from 'react';
import { CheckCircle2, RotateCcw, Share2, Rss } from 'lucide-react';
import toast from 'react-hot-toast';
import { nativeShare } from '@/lib/share';
import { postToFeed } from '@/lib/feed/api';

interface CompleteDayButtonProps {
  selectedDate: string;
  isCompleted: boolean;
  onToggle: (isCompleted: boolean) => Promise<any>;
  dailyLog?: any;
}

export default function CompleteDayButton({
  selectedDate,
  isCompleted,
  onToggle,
  dailyLog,
}: CompleteDayButtonProps) {
  const [busy, setBusy] = useState(false);
  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  const handleShare = () => {
    if (!dailyLog) return;

    const details = {
      calories: dailyLog.total_calories ?? 0,
      protein: dailyLog.total_protein_g ?? 0,
      carbs: dailyLog.total_carbs_g ?? 0,
      fats: dailyLog.total_fats_g ?? 0,
    };
    const targets = {
      calories: dailyLog.target_calories || 2500,
      protein: dailyLog.target_protein_g || 180,
      carbs: dailyLog.target_carbs_g || 300,
      fats: dailyLog.target_fats_g || 70,
    };

    let mealText = '';
    if (dailyLog.meals && dailyLog.meals.length > 0) {
      const grouped = dailyLog.meals.reduce((acc: any, m: any) => {
        const type = m.meal_type || 'Other';
        if (!acc[type]) acc[type] = [];
        acc[type].push(m);
        return acc;
      }, {});

      const sections = Object.entries(grouped).map(
        ([type, foods]: [string, any]) => {
          const sectionTitle = type.charAt(0).toUpperCase() + type.slice(1);
          const foodLines = foods.map(
            (m: any) => `  • ${m.food_name || m.name} (${m.calories} kcal)`,
          );
          return `${sectionTitle}:\n${foodLines.join('\n')}`;
        },
      );

      mealText = '\n\nMeals logged:\n' + sections.join('\n\n');
    }
    const text = `Hit my nutrition goals! 🎯\n${details.calories}/${targets.calories} kcal | ${details.protein}g Protein | ${details.carbs}g Carbs | ${details.fats}g Fats.${mealText}`;
    nativeShare('Daily Nutrition', text);
  };

  const handlePostToFeed = async () => {
    if (!dailyLog) return;
    toast.loading('Posting to feed...', { id: 'feed-post' });
    try {
      await postToFeed({
        event_type: 'diary_shared',
        subject_id: dailyLog.date,
        title: `Diary Completed: ${dailyLog.date}`,
        payload: {
          calories: dailyLog.total_calories,
          protein_g: dailyLog.total_protein_g,
          carbs_g: dailyLog.total_carbs_g,
          fats_g: dailyLog.total_fats_g,
          meals: dailyLog.meals || [],
        },
      });
      toast.success('Posted to activity feed!', { id: 'feed-post' });
    } catch {
      toast.error('Failed to post', { id: 'feed-post' });
    }
  };

  const handleToggle = async () => {
    setBusy(true);
    const targetState = !isCompleted;
    try {
      await onToggle(targetState);
      if (targetState) {
        toast.success(
          isToday
            ? '🎉 Day completed! Great work today.'
            : 'Day marked as completed.',
        );
      } else {
        toast.success('Diary reopened for edits.');
      }
    } catch {
      toast.error('Could not update status. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-full pt-4 pb-8 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-neutral-800/80 mt-6">
      <div className="flex items-center gap-2">
        <span
          className={`w-2.5 h-2.5 rounded-full ${
            isCompleted
              ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]'
              : 'bg-amber-400'
          }`}
        />
        <span className="text-xs font-mono text-neutral-400">
          Status:{' '}
          <strong
            className={isCompleted ? 'text-emerald-400' : 'text-neutral-200'}
          >
            {isCompleted ? 'Completed' : 'In Progress'}
          </strong>
        </span>
      </div>
      <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-3">
        {isCompleted && (
          <>
            <button
              onClick={handlePostToFeed}
              className="w-full sm:w-auto px-6 py-3 rounded-xl font-mono text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg bg-sky-600 hover:bg-sky-500 text-white shadow-sky-900/20"
            >
              <Rss size={16} />
              POST TO FEED
            </button>
            <button
              onClick={handleShare}
              className="w-full sm:w-auto px-6 py-3 rounded-xl font-mono text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-900/20"
            >
              <Share2 size={16} />
              SHARE DIARY
            </button>
          </>
        )}
        <button
          onClick={handleToggle}
          disabled={busy}
          className={`w-full sm:w-auto px-6 py-3 rounded-xl font-mono text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 ${
            isCompleted
              ? 'bg-neutral-900 border border-neutral-700 hover:border-neutral-500 text-neutral-300 hover:text-white'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20'
          }`}
        >
          {isCompleted ? (
            <>
              <RotateCcw size={15} />
              REOPEN DIARY FOR EDITS
            </>
          ) : (
            <>
              <CheckCircle2 size={16} />
              COMPLETE DAY
            </>
          )}
        </button>
      </div>
    </div>
  );
}
