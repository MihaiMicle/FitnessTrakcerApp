'use client';

import { useMemo } from 'react';
import { REGION_VIEW } from '@/lib/workouts/bodyMap';
import type { BodyRegion } from '@/lib/workouts/bodyMap';
import BodyFigure from './BodyFigure';
import { regionCrop } from './bounds';
import type { BodySex } from './types';

interface BodyRegionIconProps {
  sex: BodySex;
  region: BodyRegion;
  /* Highlight colour, defaults to the muted fill used for unranked regions */
  color?: string;
  baseColor?: string;
  className?: string;
}

/*
 * One region, cropped and zoomed, for use beside a label. Picks the side of the
 * body that shows the region rather than always drawing the front
 */
export default function BodyRegionIcon({
  sex,
  region,
  color = '#71717a',
  baseColor = '#3a3a42',
  className = 'h-full w-full',
}: BodyRegionIconProps) {
  const view = REGION_VIEW[region];
  const crop = useMemo(
    () => regionCrop(sex, view, region),
    [sex, view, region],
  );

  return (
    <BodyFigure
      sex={sex}
      view={view}
      crop={crop}
      colors={{ [region]: color }}
      baseColor={baseColor}
      outlineColor="#2a2a30"
      className={className}
      label={region}
    />
  );
}
