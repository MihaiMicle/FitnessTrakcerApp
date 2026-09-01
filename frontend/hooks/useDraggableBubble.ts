'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BUBBLE_STORAGE_KEY,
  clampPosition,
  defaultPosition,
  isTap,
  parseStoredPosition,
  type Point,
  type Viewport,
} from '@/lib/copilot/position';

/*
 * Dragging the bubble.
 *
 * Pointer events rather than mouse or touch, so one code path covers a mouse,
 * a finger and a stylus. Capture is taken on the element itself, which keeps
 * the drag alive when the pointer moves faster than React can re-render and
 * leaves the button behind
 */

const readViewport = (): Viewport => ({
  width: window.innerWidth,
  height: window.innerHeight,
});

export function useDraggableBubble() {
  const [position, setPosition] = useState<Point | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const origin = useRef<Point>({ x: 0, y: 0 });
  const grabOffset = useRef<Point>({ x: 0, y: 0 });
  const movedRef = useRef(false);

  /* Position is resolved on mount, not during render, because the viewport is
     not known on the server and a guessed value would visibly jump */
  useEffect(() => {
    const viewport = readViewport();
    const stored = parseStoredPosition(
      window.localStorage.getItem(BUBBLE_STORAGE_KEY),
    );
    setPosition(clampPosition(stored ?? defaultPosition(viewport), viewport));
  }, []);

  /* Rotating a phone can leave the bubble off screen, so re-clamp on resize */
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => (prev ? clampPosition(prev, readViewport()) : prev));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (!position) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      origin.current = { x: event.clientX, y: event.clientY };
      grabOffset.current = {
        x: event.clientX - position.x,
        y: event.clientY - position.y,
      };
      movedRef.current = false;
      setIsDragging(true);
    },
    [position],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (!isDragging) return;
      const next = clampPosition(
        {
          x: event.clientX - grabOffset.current.x,
          y: event.clientY - grabOffset.current.y,
        },
        readViewport(),
      );
      if (!isTap(origin.current, { x: event.clientX, y: event.clientY })) {
        movedRef.current = true;
      }
      setPosition(next);
    },
    [isDragging],
  );

  /*
   * Returns whether this gesture was a tap, so the caller can open the panel.
   * A click handler cannot make that call on its own: a drag that ends over
   * the button fires click too, and the panel would open every time the user
   * repositioned the bubble
   */
  const onPointerUp = useCallback(
    (event: React.PointerEvent<HTMLElement>): boolean => {
      if (!isDragging) return false;
      event.currentTarget.releasePointerCapture?.(event.pointerId);
      setIsDragging(false);

      const wasTap = !movedRef.current;
      if (!wasTap && position) {
        window.localStorage.setItem(
          BUBBLE_STORAGE_KEY,
          JSON.stringify(position),
        );
      }
      return wasTap;
    },
    [isDragging, position],
  );

  return { position, isDragging, onPointerDown, onPointerMove, onPointerUp };
}
