'use client';

import { useMemo } from 'react';
import type { BodyRegion } from '@/lib/workouts/bodyMap';
import { bodyFigure } from './index';
import { BODY_MIRROR, BODY_VIEWBOX } from './types';
import type { BodyPart, BodySex, BodyView } from './types';
import type { Box } from './bounds';

export interface BodyFigureProps {
  sex: BodySex;
  view: BodyView;
  /* Fill per region. Anything missing falls back to baseColor */
  colors?: Partial<Record<BodyRegion, string>>;
  baseColor?: string;
  outlineColor?: string;
  strokeColor?: string;
  selected?: BodyRegion | null;
  onSelect?: (region: BodyRegion) => void;
  /* Zoom to part of the canvas instead of showing the whole figure */
  crop?: Box;
  className?: string;
  label?: string;
}

/* Parts grouped by region so both sides light up together on hover */
function groupParts(parts: BodyPart[]) {
  const inert: BodyPart[] = [];
  const byRegion = new Map<BodyRegion, BodyPart[]>();
  for (const part of parts) {
    if (!part.region) {
      inert.push(part);
      continue;
    }
    const bucket = byRegion.get(part.region);
    if (bucket) bucket.push(part);
    else byRegion.set(part.region, [part]);
  }
  return { inert, byRegion };
}

export default function BodyFigure({
  sex,
  view,
  colors = {},
  baseColor = '#2f2f35',
  outlineColor = '#26262c',
  strokeColor = '#131316',
  selected = null,
  onSelect,
  crop,
  className = 'h-full w-auto max-w-full',
  label,
}: BodyFigureProps) {
  const { inert, byRegion } = useMemo(
    () => groupParts(bodyFigure(sex, view)),
    [sex, view],
  );
  const interactive = Boolean(onSelect);
  const box = crop ?? { x: 0, y: 0, ...BODY_VIEWBOX };

  /* Stroke is in user units, so a zoomed crop would otherwise thicken it */
  const scale = box.width / BODY_VIEWBOX.width;

  return (
    <svg
      viewBox={`${box.x} ${box.y} ${box.width} ${box.height}`}
      className={className}
      role="img"
      aria-label={label ?? `${sex} body ${view} view`}
      xmlns="http://www.w3.org/2000/svg"
    >
      {inert.map((part) => (
        <g key={part.id}>
          <path d={part.d} fill={outlineColor} />
          <path d={part.d} fill={outlineColor} transform={BODY_MIRROR} />
        </g>
      ))}

      {[...byRegion.entries()].map(([region, parts]) => {
        const fill = colors[region] ?? baseColor;
        const isSelected = selected === region;
        const stroke = isSelected ? '#ffffff' : strokeColor;
        const strokeWidth = (isSelected ? 2 : 1.2) * scale;
        return (
          <g
            key={region}
            onClick={interactive ? () => onSelect?.(region) : undefined}
            onKeyDown={
              interactive
                ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelect?.(region);
                    }
                  }
                : undefined
            }
            role={interactive ? 'button' : undefined}
            tabIndex={interactive ? 0 : undefined}
            aria-pressed={interactive ? isSelected : undefined}
            className={
              interactive
                ? 'cursor-pointer outline-none transition-opacity hover:opacity-80 focus-visible:opacity-80'
                : undefined
            }
          >
            <title>{region}</title>
            {parts.map((part) => (
              <g key={part.id}>
                <path
                  d={part.d}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={strokeWidth}
                  strokeLinejoin="round"
                />
                <path
                  d={part.d}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={strokeWidth}
                  strokeLinejoin="round"
                  transform={BODY_MIRROR}
                />
              </g>
            ))}
          </g>
        );
      })}
    </svg>
  );
}
