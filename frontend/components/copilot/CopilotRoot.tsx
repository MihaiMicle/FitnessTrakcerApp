'use client';

import { Sparkles } from 'lucide-react';
import { useDraggableBubble } from '@/hooks/useDraggableBubble';
import { useCopilot } from '@/lib/context/CopilotContext';
import { BUBBLE_SIZE } from '@/lib/copilot/position';
import CopilotPanel from './CopilotPanel';

/*
 * The copilot bubble and the panel it opens.
 *
 * z-index matters more than it looks. LiveWorkout is a full screen overlay at
 * z-[100], so anything below that is invisible during a workout, which is
 * exactly when "what should I do next" is worth asking. The bubble sits above
 * it at z-[110] and the panel at z-[120]
 */
export default function CopilotRoot() {
  const copilot = useCopilot();
  const drag = useDraggableBubble();

  /* Nothing renders until the viewport has been measured, so the bubble never
     flashes in the wrong corner before settling */
  if (!drag.position) return null;

  return (
    <>
      <button
        onPointerDown={drag.onPointerDown}
        onPointerMove={drag.onPointerMove}
        onPointerUp={(event) => {
          /* Only a tap opens the panel. A drag that happens to end over the
             button fires click too, and without this the panel would open
             every time the user repositioned the bubble */
          if (drag.onPointerUp(event)) copilot.toggle();
        }}
        aria-label={copilot.isOpen ? 'Close copilot' : 'Open copilot'}
        aria-expanded={copilot.isOpen}
        style={{
          left: drag.position.x,
          top: drag.position.y,
          width: BUBBLE_SIZE,
          height: BUBBLE_SIZE,
          touchAction: 'none',
        }}
        className={`fixed z-[110] rounded-full bg-emerald-600 text-white shadow-[0_0_20px_rgba(5,150,105,0.4)] flex items-center justify-center hover:bg-emerald-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 ${
          drag.isDragging
            ? 'cursor-grabbing scale-110 transition-transform'
            : 'cursor-grab transition-all hover:scale-105'
        }`}
      >
        <Sparkles size={22} />
        {copilot.hasLiveWorkout && !copilot.isOpen && (
          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-indigo-500 border-2 border-neutral-950" />
        )}
      </button>

      {copilot.isOpen && <CopilotPanel bubble={drag.position} />}
    </>
  );
}
