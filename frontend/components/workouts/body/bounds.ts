/* components/workouts/body/bounds.ts */

import { bodyFigure } from './index';
import { BODY_VIEWBOX } from './types';
import type { BodySex, BodyView } from './types';
import type { BodyRegion } from '@/lib/workouts/bodyMap';

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

const NUM = /-?\d+(?:\.\d+)?/g;
const SAMPLES = 16;

function cubic(p0: number, p1: number, p2: number, p3: number, t: number) {
  const u = 1 - t;
  return (
    u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3
  );
}

/*
 * Walks a path and returns every point it actually passes through. Curve
 * control points are not enough: a bezier stays inside its hull, so using the
 * controls directly pads the box by whatever slack the hull has, which is what
 * makes a cropped icon look off-centre
 */
function samplePath(d: string) {
  const nums = (d.match(NUM) ?? []).map(Number);
  const cmds = d.match(/[MLCZ]/g) ?? [];
  const points: Array<[number, number]> = [];
  let i = 0;
  let cx = 0;
  let cy = 0;

  for (const cmd of cmds) {
    if (cmd === 'Z') continue;
    if (cmd === 'M' || cmd === 'L') {
      cx = nums[i++];
      cy = nums[i++];
      points.push([cx, cy]);
      continue;
    }
    const [x1, y1, x2, y2, x3, y3] = nums.slice(i, i + 6);
    i += 6;
    for (let s = 1; s <= SAMPLES; s++) {
      const t = s / SAMPLES;
      points.push([cubic(cx, x1, x2, x3, t), cubic(cy, y1, y2, y3, t)]);
    }
    cx = x3;
    cy = y3;
  }

  return points;
}

const cache = new Map<string, Box>();

/*
 * Box around a region, mirrored halves included and always centred on the
 * figure's midline so icons for different regions sit at the same scale
 */
export function regionBounds(
  sex: BodySex,
  view: BodyView,
  region: BodyRegion,
): Box | null {
  const key = `${sex}:${view}:${region}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const parts = bodyFigure(sex, view).filter((p) => p.region === region);
  if (parts.length === 0) return null;

  const mid = BODY_VIEWBOX.width / 2;
  let half = 0;
  let top = Infinity;
  let bottom = -Infinity;

  for (const part of parts) {
    for (const [x, y] of samplePath(part.d)) {
      half = Math.max(half, Math.abs(x - mid));
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  }

  const box = { x: mid - half, y: top, width: half * 2, height: bottom - top };
  cache.set(key, box);
  return box;
}

/*
 * Square crop around a region. minSide keeps small regions from zooming in so
 * far that the surrounding body is gone and the icon stops being recognisable
 */
export function regionCrop(
  sex: BodySex,
  view: BodyView,
  region: BodyRegion,
  pad = 0.5,
  minSide = 150,
): Box {
  const full = { x: 0, y: 0, ...BODY_VIEWBOX };
  const box = regionBounds(sex, view, region);
  if (!box) return full;

  const side = Math.max(Math.max(box.width, box.height) * (1 + pad), minSide);
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  return {
    x: cx - side / 2,
    y: cy - side / 2,
    width: side,
    height: side,
  };
}
