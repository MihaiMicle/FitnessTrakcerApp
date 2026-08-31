// components/workouts/WidgetStack.tsx
'use client';
import { useState, ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function WidgetStack({ children }: { children: ReactNode[] }) {
  const [activeIndex, setActiveIndex] = useState(0);

  // Optional: Add swipe support for mobile
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const goToPrev = () => {
    if (activeIndex > 0) setActiveIndex((prev) => prev - 1);
  };

  const goToNext = () => {
    if (activeIndex < children.length - 1) setActiveIndex((prev) => prev + 1);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) goToNext();
    if (isRightSwipe) goToPrev();
  };

  return (
    <div className="w-full">
      {/* Active Widget */}
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className="w-full transition-opacity duration-300 touch-pan-y"
      >
        {children[activeIndex]}
      </div>

      {/* Navigation & Pagination */}
      <div className="mt-4 flex justify-center items-center gap-4">
        {/* Left Arrow (Desktop Only) */}
        <button
          onClick={goToPrev}
          disabled={activeIndex === 0}
          className="p-1 text-neutral-500 hover:text-white disabled:opacity-0 transition-all hidden sm:block"
          aria-label="Previous widget"
        >
          <ChevronLeft size={20} />
        </button>

        <div className="flex gap-2">
          {children.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setActiveIndex(idx)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                activeIndex === idx
                  ? 'w-4 bg-indigo-500'
                  : 'w-1.5 bg-neutral-700 hover:bg-neutral-600'
              }`}
              aria-label={`Go to widget ${idx + 1}`}
            />
          ))}
        </div>

        {/* Right Arrow (Desktop Only) */}
        <button
          onClick={goToNext}
          disabled={activeIndex === children.length - 1}
          className="p-1 text-neutral-500 hover:text-white disabled:opacity-0 transition-all hidden sm:block"
          aria-label="Next widget"
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}
