/* components/workouts/body/types.ts */

import type { BodyRegion } from '@/lib/workouts/bodyMap';

export interface BodyPart {
  id: string;
  /* null for inert geometry: the silhouette itself, head, hands, feet */
  region: BodyRegion | null;
  d: string;
}

export type BodySex = 'male' | 'female';
export type BodyView = 'front' | 'back';

/* Authoring canvas for every figure. Half the figure is drawn and mirrored */
export const BODY_VIEWBOX = { width: 220, height: 440 };
export const BODY_MIRROR = `matrix(-1 0 0 1 ${BODY_VIEWBOX.width} 0)`;
