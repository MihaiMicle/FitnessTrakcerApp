import { describe, it, expect } from 'vitest';
import { MUSCLES } from '../constants';
import {
  BODY_REGIONS,
  REGION_MUSCLES,
  REGION_VIEW,
  regionForMuscle,
  unmappedMuscles,
} from '../bodyMap';
import { FIGURES } from '@/components/workouts/body';
import { regionBounds, regionCrop } from '@/components/workouts/body/bounds';

/*
 * The body map is the only place a muscle name becomes a pixel. If a muscle in
 * MUSCLES maps to no region, exercises tagged with it rank correctly in the
 * list but paint nothing on the silhouette, which looks like a bug in the
 * ranking rather than a gap in this table
 */

describe('REGION_MUSCLES', () => {
  it('covers every region exactly once', () => {
    expect(Object.keys(REGION_MUSCLES).sort()).toEqual(
      [...BODY_REGIONS].sort(),
    );
  });

  it('maps every muscle in MUSCLES', () => {
    expect(unmappedMuscles()).toEqual([]);
  });

  it('only references muscles that exist in MUSCLES', () => {
    const unknown = Object.values(REGION_MUSCLES)
      .flat()
      .filter((m) => !MUSCLES.includes(m));
    expect(unknown).toEqual([]);
  });

  it('never assigns a muscle to two regions', () => {
    const all = Object.values(REGION_MUSCLES).flat();
    expect(new Set(all).size).toBe(all.length);
  });
});

describe('regionForMuscle', () => {
  it('resolves a muscle to its region', () => {
    expect(regionForMuscle('Lateral Delt')).toBe('Shoulders');
    expect(regionForMuscle('Brachialis')).toBe('Biceps');
    expect(regionForMuscle('Lower Back')).toBe('Glutes');
  });

  it('returns null for unknown or empty input', () => {
    expect(regionForMuscle('Gills')).toBeNull();
    expect(regionForMuscle('')).toBeNull();
    expect(regionForMuscle(null)).toBeNull();
    expect(regionForMuscle(undefined)).toBeNull();
  });
});

describe('figures', () => {
  const figures = Object.entries(FIGURES).flatMap(([sex, views]) =>
    Object.entries(views).map(
      ([view, parts]) => [`${sex} ${view}`, parts] as const,
    ),
  );

  it.each(figures)('%s has valid path data', (_label, parts) => {
    expect(parts.length).toBeGreaterThan(0);
    for (const part of parts) {
      expect(part.d.startsWith('M')).toBe(true);
      expect(part.d.trim().endsWith('Z')).toBe(true);
      if (part.region) expect(BODY_REGIONS).toContain(part.region);
    }
  });

  it.each(figures)('%s has unique part ids', (_label, parts) => {
    const ids = parts.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('paints every region across the front and back of each sex', () => {
    for (const sex of ['male', 'female'] as const) {
      const painted = new Set(
        [...FIGURES[sex].front, ...FIGURES[sex].back]
          .map((p) => p.region)
          .filter(Boolean),
      );
      expect([...painted].sort()).toEqual([...BODY_REGIONS].sort());
    }
  });

  it('keeps every coordinate inside the authoring canvas', () => {
    for (const [, parts] of figures) {
      for (const part of parts) {
        const nums = part.d.match(/-?\d+(?:\.\d+)?/g) ?? [];
        for (let i = 0; i < nums.length; i += 2) {
          expect(Number(nums[i])).toBeGreaterThanOrEqual(0);
          expect(Number(nums[i])).toBeLessThanOrEqual(220);
          expect(Number(nums[i + 1])).toBeGreaterThanOrEqual(0);
          expect(Number(nums[i + 1])).toBeLessThanOrEqual(440);
        }
      }
    }
  });
});

describe('REGION_VIEW', () => {
  it('points every region at a view that actually draws it', () => {
    for (const region of BODY_REGIONS) {
      const view = REGION_VIEW[region];
      const drawn = FIGURES.male[view].some((p) => p.region === region);
      expect(drawn, `${region} is not on the ${view}`).toBe(true);
    }
  });
});

describe('regionCrop', () => {
  it('contains the region it crops to', () => {
    for (const sex of ['male', 'female'] as const) {
      for (const region of BODY_REGIONS) {
        const view = REGION_VIEW[region];
        const box = regionBounds(sex, view, region)!;
        const crop = regionCrop(sex, view, region);
        expect(crop.x).toBeLessThanOrEqual(box.x);
        expect(crop.y).toBeLessThanOrEqual(box.y);
        expect(crop.x + crop.width).toBeGreaterThanOrEqual(box.x + box.width);
        expect(crop.y + crop.height).toBeGreaterThanOrEqual(box.y + box.height);
      }
    }
  });

  it('stays square and centred on the midline', () => {
    for (const region of BODY_REGIONS) {
      const crop = regionCrop('male', REGION_VIEW[region], region);
      expect(crop.width).toBe(crop.height);
      expect(crop.x + crop.width / 2).toBeCloseTo(110, 5);
    }
  });

  it('never crops tighter than the minimum, so icons stay recognisable', () => {
    for (const region of BODY_REGIONS) {
      expect(
        regionCrop('male', REGION_VIEW[region], region).width,
      ).toBeGreaterThanOrEqual(150);
    }
  });

  it('measures the curve rather than its control points', () => {
    /* Abs is a curve whose controls sit outside the shape it draws. A hull
       based box would be wider than the muscle actually is */
    const box = regionBounds('male', 'front', 'Abs')!;
    expect(box.width).toBeLessThan(44);
    expect(box.height).toBeGreaterThan(50);
  });
});
