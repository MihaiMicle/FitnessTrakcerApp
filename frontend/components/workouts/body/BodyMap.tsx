'use client';

import BodyFigure from './BodyFigure';
import type { BodyFigureProps } from './BodyFigure';
import type { BodyView } from './types';

interface BodyMapProps extends Omit<BodyFigureProps, 'view' | 'className'> {
  views?: BodyView[];
  className?: string;
}

export default function BodyMap({
  views = ['front', 'back'],
  className = '',
  ...figure
}: BodyMapProps) {
  return (
    <div className={`flex items-stretch justify-center gap-2 ${className}`}>
      {views.map((view) => (
        <BodyFigure key={view} view={view} {...figure} />
      ))}
    </div>
  );
}
