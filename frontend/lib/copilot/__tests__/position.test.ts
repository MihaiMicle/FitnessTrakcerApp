/* lib/copilot/__tests__/position.test.ts */

import { describe, it, expect } from 'vitest';
import {
  BUBBLE_SIZE,
  EDGE_MARGIN,
  clampPosition,
  defaultPosition,
  isTap,
  panelAnchor,
  panelSize,
  parseStoredPosition,
} from '../position';

const desktop = { width: 1440, height: 900 };
const phone = { width: 390, height: 844 };

describe('clampPosition', () => {
  it('leaves a position that is already on screen alone', () => {
    expect(clampPosition({ x: 200, y: 300 }, desktop)).toEqual({
      x: 200,
      y: 300,
    });
  });

  it('pulls a bubble dragged off the right edge back', () => {
    const result = clampPosition({ x: 5000, y: 300 }, desktop);
    expect(result.x).toBe(desktop.width - BUBBLE_SIZE - EDGE_MARGIN);
  });

  it('pulls a bubble dragged off the top left back', () => {
    expect(clampPosition({ x: -80, y: -80 }, desktop)).toEqual({
      x: EDGE_MARGIN,
      y: EDGE_MARGIN,
    });
  });

  it('keeps the bubble reachable on a viewport smaller than the bubble', () => {
    /* A collapsed viewport during rotation must not produce a negative
       coordinate that puts the bubble permanently off screen */
    const result = clampPosition({ x: 100, y: 100 }, { width: 40, height: 40 });
    expect(result.x).toBeGreaterThanOrEqual(0);
    expect(result.y).toBeGreaterThanOrEqual(0);
  });
});

describe('defaultPosition', () => {
  it('starts bottom right', () => {
    const result = defaultPosition(desktop);
    expect(result.x).toBeGreaterThan(desktop.width / 2);
    expect(result.y).toBeGreaterThan(desktop.height / 2);
  });

  it('stays on screen on a phone', () => {
    const result = defaultPosition(phone);
    expect(result.x + BUBBLE_SIZE).toBeLessThanOrEqual(phone.width);
    expect(result.y + BUBBLE_SIZE).toBeLessThanOrEqual(phone.height);
  });
});

describe('isTap', () => {
  it('treats a still press as a tap', () => {
    expect(isTap({ x: 100, y: 100 }, { x: 102, y: 99 })).toBe(true);
  });

  it('treats a real drag as not a tap', () => {
    expect(isTap({ x: 100, y: 100 }, { x: 180, y: 260 })).toBe(false);
  });

  it('treats movement exactly on the threshold as a tap', () => {
    expect(isTap({ x: 0, y: 0 }, { x: 6, y: 0 })).toBe(true);
  });
});

describe('panelAnchor', () => {
  it('opens above and left of a bottom right bubble', () => {
    const bubble = defaultPosition(desktop);
    const anchor = panelAnchor(bubble, desktop);
    expect(anchor.y).toBeLessThan(bubble.y);
    expect(anchor.x).toBeLessThan(bubble.x);
  });

  it('flips below when the bubble is at the top', () => {
    const anchor = panelAnchor({ x: 600, y: 20 }, desktop);
    expect(anchor.y).toBeGreaterThan(20);
  });

  it('never returns a negative coordinate for a top left bubble', () => {
    const anchor = panelAnchor({ x: EDGE_MARGIN, y: EDGE_MARGIN }, desktop);
    expect(anchor.x).toBeGreaterThanOrEqual(EDGE_MARGIN);
    expect(anchor.y).toBeGreaterThanOrEqual(EDGE_MARGIN);
  });

  it('keeps the panel fully on screen on a phone', () => {
    const size = panelSize(phone);
    const anchor = panelAnchor(defaultPosition(phone), phone);
    expect(anchor.x + size.width).toBeLessThanOrEqual(phone.width);
    expect(anchor.y + size.height).toBeLessThanOrEqual(phone.height);
  });
});

describe('panelSize', () => {
  it('shrinks to fit a narrow viewport', () => {
    expect(panelSize(phone).width).toBeLessThanOrEqual(
      phone.width - EDGE_MARGIN * 2,
    );
  });

  it('does not grow past the design width on a wide viewport', () => {
    expect(panelSize(desktop).width).toBe(380);
  });
});

describe('parseStoredPosition', () => {
  it('reads a stored point', () => {
    expect(parseStoredPosition('{"x":10,"y":20}')).toEqual({ x: 10, y: 20 });
  });

  it('returns null for missing storage', () => {
    expect(parseStoredPosition(null)).toBeNull();
  });

  it('returns null for malformed json', () => {
    expect(parseStoredPosition('not json')).toBeNull();
  });

  it('rejects non-numeric coordinates', () => {
    expect(parseStoredPosition('{"x":"left","y":20}')).toBeNull();
  });

  it('rejects infinite coordinates', () => {
    /* JSON.parse turns 1e999 into Infinity, which would clamp to NaN and
       leave the bubble unrenderable */
    expect(parseStoredPosition('{"x":1e999,"y":20}')).toBeNull();
  });
});
