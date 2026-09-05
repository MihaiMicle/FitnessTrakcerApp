/* lib/feed/saveToLibrary.ts */

import { supabase } from '@/lib/supabase';
import type { FeedEventItem } from '@/types/feed';
import {
  type CopyDestination,
  copyDestinationFor,
  recipePayload,
  routineTemplatePayload,
  savedMealPayload,
} from './copyToLibrary';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

/* Saves a feed event into the viewer's own library, in whichever table its
   type belongs. A type nothing here recognises is a silent no-op, matching
   the handler this was extracted from */
export async function saveEventToLibrary(
  event: FeedEventItem,
  accessToken: string,
  userId: string,
): Promise<CopyDestination> {
  const destination = copyDestinationFor(event.event_type);

  if (destination === 'routine') {
    const res = await fetch(`${BASE_URL}/workouts/templates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(routineTemplatePayload(event)),
    });
    if (!res.ok) throw new Error('Failed to save routine');
  } else if (destination === 'recipe') {
    const { error } = await supabase
      .from('recipes')
      .insert(recipePayload(event, userId));
    if (error) throw error;
  } else if (destination === 'meal') {
    const { error } = await supabase
      .from('saved_meals')
      .insert(savedMealPayload(event, userId));
    if (error) throw error;
  }

  return destination;
}
