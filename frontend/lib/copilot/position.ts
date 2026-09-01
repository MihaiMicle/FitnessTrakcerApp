/* lib/copilot/position.ts */

/*
 * Where the bubble sits and where the panel opens from.
 *
 * All pure geometry, kept out of the component so the rules can be tested
 * without a DOM. The bubble is draggable anywhere on screen, which means every
 * one of these functions exists to stop it ending up somewhere unusable
 */

export interface Point {
  x: number;
  y: number;
}

export interface Viewport {
  width: number;
  height: number;
}

export const BUBBLE_SIZE = 56;
export const EDGE_MARGIN = 12;

/* Pointer travel below this is a tap, not a drag. Six pixels is roughly the
   wobble of a thumb pressing a button on a phone held one-handed */
export const TAP_THRESHOLD_PX = 6;

export const PANEL_WIDTH = 380;
export const PANEL_HEIGHT = 560;
export const PANEL_GAP = 12;

/* Keeps the whole bubble on screen with a margin, whatever the drag did */
export function clampPosition(
  position: Point,
  viewport: Viewport,
  size: number = BUBBLE_SIZE,
  margin: number = EDGE_MARGIN,
): Point {
  const maxX = Math.max(margin, viewport.width - size - margin);
  const maxY = Math.max(margin, viewport.height - size - margin);
  return {
    x: Math.min(Math.max(position.x, margin), maxX),
    y: Math.min(Math.max(position.y, margin), maxY),
  };
}

/* Bottom right, above where a thumb rests, matching where the old fixed bubble
   used to be so nobody has to hunt for it after upgrading */
export function defaultPosition(
  viewport: Viewport,
  size: number = BUBBLE_SIZE,
): Point {
  return clampPosition(
    { x: viewport.width - size - 24, y: viewport.height - size - 24 },
    viewport,
    size,
  );
}

export function isTap(
  start: Point,
  end: Point,
  threshold: number = TAP_THRESHOLD_PX,
): boolean {
  return Math.abs(end.x - start.x) <= threshold &&
    Math.abs(end.y - start.y) <= threshold;
}

/*
 * Where to draw the panel given where the user parked the bubble.
 *
 * Opens above and to the left by default, then flips on whichever axis would
 * run off screen. A bubble dragged to the top left must not open a panel that
 * starts at negative coordinates
 */
export function panelAnchor(
  bubble: Point,
  viewport: Viewport,
  panelWidth: number = PANEL_WIDTH,
  panelHeight: number = PANEL_HEIGHT,
  size: number = BUBBLE_SIZE,
): Point {
  const width = Math.min(panelWidth, viewport.width - EDGE_MARGIN * 2);
  const height = Math.min(panelHeight, viewport.height - EDGE_MARGIN * 2);

  /* Prefer left-aligned to the bubble's right edge, flip if it overflows */
  let x = bubble.x + size - width;
  if (x < EDGE_MARGIN) x = bubble.x;

  /* Prefer above the bubble, flip below if there is no room */
  let y = bubble.y - height - PANEL_GAP;
  if (y < EDGE_MARGIN) y = bubble.y + size + PANEL_GAP;

  return {
    x: Math.min(Math.max(x, EDGE_MARGIN), Math.max(EDGE_MARGIN, viewport.width - width - EDGE_MARGIN)),
    y: Math.min(Math.max(y, EDGE_MARGIN), Math.max(EDGE_MARGIN, viewport.height - height - EDGE_MARGIN)),
  };
}

/* Panel size actually used, shrunk to fit small screens */
export function panelSize(viewport: Viewport): { width: number; height: number } {
  return {
    width: Math.min(PANEL_WIDTH, viewport.width - EDGE_MARGIN * 2),
    height: Math.min(PANEL_HEIGHT, viewport.height - EDGE_MARGIN * 2),
  };
}

const STORAGE_KEY = 'copilot:bubble-position';

/* Rejects anything that is not a pair of finite numbers. A rotated phone or an
   edited localStorage value must not put the bubble somewhere unreachable */
export function parseStoredPosition(raw: string | null): Point | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (
      typeof parsed?.x === 'number' &&
      typeof parsed?.y === 'number' &&
      Number.isFinite(parsed.x) &&
      Number.isFinite(parsed.y)
    ) {
      return { x: parsed.x, y: parsed.y };
    }
  } catch {
    return null;
  }
  return null;
}

export { STORAGE_KEY as BUBBLE_STORAGE_KEY };
