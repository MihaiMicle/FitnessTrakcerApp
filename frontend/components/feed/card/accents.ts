import {
  BookCheck,
  ChefHat,
  Dumbbell,
  ListChecks,
  Trophy,
  Utensils,
} from 'lucide-react';
import type { FeedEventType } from '@/types/feed';

/* One accent per activity, so the feed is scannable without reading it */
export const ACCENTS: Record<
  FeedEventType,
  { Icon: typeof Dumbbell; color: string; ring: string }
> = {
  workout: {
    Icon: Dumbbell,
    color: 'text-indigo-400',
    ring: 'border-indigo-500/20',
  },
  personal_record: {
    Icon: Trophy,
    color: 'text-amber-400',
    ring: 'border-amber-500/30',
  },
  routine_shared: {
    Icon: ListChecks,
    color: 'text-emerald-400',
    ring: 'border-emerald-500/20',
  },
  meal_shared: {
    Icon: Utensils,
    color: 'text-emerald-400',
    ring: 'border-emerald-500/20',
  },
  recipe_shared: {
    Icon: ChefHat,
    color: 'text-amber-400',
    ring: 'border-amber-500/30',
  },
  diary_shared: {
    Icon: BookCheck,
    color: 'text-sky-400',
    ring: 'border-sky-500/20',
  },
};
