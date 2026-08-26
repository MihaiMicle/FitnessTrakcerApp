'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  SharePhoto,
  buildComparisonImage,
  daysBetween,
  formatPhotoDate,
  shareImageBlob,
} from '@/lib/progressShare';

interface ProgressGalleryProps {
  isOpen: boolean;
  onClose: () => void;
  logs: any[];
}

type Mode = 'single' | 'compare';
type Pane = 'left' | 'right';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/*
  Full-screen viewer for physique photos attached to weight logs. Photos can be
  viewed one at a time or side by side; the filmstrip drives whichever pane is
  active
 */
export default function ProgressGallery({
  isOpen,
  onClose,
  logs,
}: ProgressGalleryProps) {
  const photos: SharePhoto[] = useMemo(
    () =>
      logs
        .filter((log) => log.photo_url)
        .map((log) => ({
          url: log.photo_url,
          weight_kg: Number(log.weight_kg) || 0,
          date: log.date,
        }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    [logs],
  );

  const [mode, setMode] = useState<Mode>('compare');
  const [activePane, setActivePane] = useState<Pane>('right');
  const [leftIndex, setLeftIndex] = useState(0);
  const [rightIndex, setRightIndex] = useState(0);
  const [isSharing, setIsSharing] = useState(false);

  const stripRef = useRef<HTMLDivElement>(null);
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const lastIndex = Math.max(photos.length - 1, 0);
  const activeIndex = activePane === 'left' ? leftIndex : rightIndex;
  const setActiveIndex = useCallback(
    (index: number) => {
      const clamped = Math.min(Math.max(index, 0), lastIndex);
      if (activePane === 'left') setLeftIndex(clamped);
      else setRightIndex(clamped);
    },
    [activePane, lastIndex],
  );

  // Open on the widest span available: first photo against the most recent
  useEffect(() => {
    if (!isOpen) return;
    setLeftIndex(0);
    setRightIndex(lastIndex);
    setActivePane('right');
    setMode(photos.length > 1 ? 'compare' : 'single');
  }, [isOpen, lastIndex, photos.length]);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') setActiveIndex(activeIndex - 1);
      if (e.key === 'ArrowRight') setActiveIndex(activeIndex + 1);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose, activeIndex, setActiveIndex]);

  // Keep the selected thumbnail in view as the selection moves
  useEffect(() => {
    if (!isOpen) return;
    thumbRefs.current[activeIndex]?.scrollIntoView({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      inline: 'center',
      block: 'nearest',
    });
  }, [isOpen, activeIndex]);

  const handleShare = async () => {
    setIsSharing(true);
    toast.loading('Building image...', { id: 'share' });
    try {
      const selection =
        mode === 'compare'
          ? [photos[leftIndex], photos[rightIndex]]
          : [photos[activeIndex]];

      const blob = await buildComparisonImage(selection);
      const result = await shareImageBlob(blob, 'progress.png');

      if (result === 'downloaded')
        toast.success('Image saved to your downloads', { id: 'share' });
      else toast.dismiss('share');
    } catch {
      toast.error('Could not build the image. Try again.', { id: 'share' });
    } finally {
      setIsSharing(false);
    }
  };

  if (!isOpen) return null;

  const panes: { pane: Pane; photo: SharePhoto | undefined }[] =
    mode === 'compare'
      ? [
          { pane: 'left', photo: photos[leftIndex] },
          { pane: 'right', photo: photos[rightIndex] },
        ]
      : [{ pane: activePane, photo: photos[activeIndex] }];

  const span =
    mode === 'compare' && photos.length > 1
      ? {
          days: daysBetween(photos[leftIndex].date, photos[rightIndex].date),
          delta: photos[rightIndex].weight_kg - photos[leftIndex].weight_kg,
        }
      : null;

  return (
    <div className="fixed inset-0 z-[60] bg-neutral-950 text-white flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 shrink-0">
        <button
          onClick={onClose}
          aria-label="Back to physique history"
          className="w-10 h-10 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-300 hover:text-white transition-colors"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10 19l-7-7 7-7M3 12h18"
            />
          </svg>
        </button>

        <h2 className="text-base font-semibold">Progress Gallery</h2>

        <button
          onClick={handleShare}
          disabled={isSharing || photos.length === 0}
          className="px-3 h-10 rounded-full bg-neutral-900 border border-neutral-800 text-sm text-neutral-300 hover:text-white disabled:opacity-40 transition-colors"
        >
          Share
        </button>
      </header>

      {photos.length === 0 ? (
        <div className="flex-1 flex items-center justify-center px-8">
          <p className="text-sm text-neutral-400 font-mono text-center leading-relaxed">
            No progress photos yet.
            <br />
            Add one to a weight entry to start the gallery.
          </p>
        </div>
      ) : (
        <>
          <div className="flex-1 min-h-0 flex">
            {panes.map(({ pane, photo }, i) => {
              const isActive = mode === 'compare' && pane === activePane;
              return (
                <button
                  key={pane}
                  type="button"
                  onClick={() => setActivePane(pane)}
                  className={`relative flex-1 min-w-0 overflow-hidden ${
                    i === 1 ? 'border-l border-neutral-950' : ''
                  } ${isActive ? 'ring-2 ring-inset ring-indigo-500/70' : ''}`}
                >
                  <img
                    src={photo?.url}
                    alt={`Progress photo from ${formatPhotoDate(
                      photo?.date ?? '',
                    )}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              );
            })}
          </div>

          <div className="shrink-0 px-4 pt-3 pb-2 space-y-3">
            <div className="flex justify-center">
              <div
                role="radiogroup"
                aria-label="Gallery layout"
                className="inline-flex bg-neutral-900 border border-neutral-800 rounded-full p-1"
              >
                {(['single', 'compare'] as Mode[]).map((option) => (
                  <button
                    key={option}
                    role="radio"
                    aria-checked={mode === option}
                    aria-label={
                      option === 'single' ? 'One photo' : 'Two photos'
                    }
                    disabled={option === 'compare' && photos.length < 2}
                    onClick={() => setMode(option)}
                    className={`px-7 py-1.5 rounded-full transition-colors disabled:opacity-30 ${
                      mode === option
                        ? 'bg-neutral-700 text-white'
                        : 'text-neutral-500 hover:text-neutral-300'
                    }`}
                  >
                    {option === 'single' ? (
                      <svg
                        className="w-4 h-4"
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.5}
                      >
                        <rect x="2.5" y="2.5" width="11" height="11" rx="1.5" />
                      </svg>
                    ) : (
                      <svg
                        className="w-4 h-4"
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.5}
                      >
                        <rect x="2.5" y="2.5" width="11" height="11" rx="1.5" />
                        <path d="M8 2.5v11" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex">
              {panes.map(({ pane, photo }) => (
                <div key={pane} className="flex-1 text-center">
                  <p className="text-sm font-semibold">
                    {photo?.weight_kg.toFixed(1)} kg
                  </p>
                  <p className="text-xs text-neutral-500 font-mono mt-0.5">
                    {formatPhotoDate(photo?.date ?? '')}
                  </p>
                </div>
              ))}
            </div>

            {span && (
              <p className="text-center text-[11px] font-mono text-indigo-400">
                {span.days} days · {span.delta >= 0 ? '+' : ''}
                {span.delta.toFixed(1)} kg
              </p>
            )}
          </div>

          <div
            ref={stripRef}
            className="shrink-0 flex gap-2 overflow-x-auto px-4 py-3 border-t border-neutral-900 custom-scrollbar"
          >
            {photos.map((photo, index) => {
              const isSelected = index === activeIndex;
              const isOtherPane =
                mode === 'compare' &&
                index === (activePane === 'left' ? rightIndex : leftIndex);

              return (
                <button
                  key={`${photo.date}-${index}`}
                  ref={(el) => {
                    thumbRefs.current[index] = el;
                  }}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  aria-label={`Show ${formatPhotoDate(photo.date)}`}
                  aria-pressed={isSelected}
                  className="relative shrink-0 pt-2"
                >
                  {isSelected && (
                    <span className="absolute top-0 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rotate-45 bg-neutral-700" />
                  )}
                  <img
                    src={photo.url}
                    alt=""
                    className={`w-16 h-20 object-cover rounded-md border transition-colors ${
                      isSelected
                        ? 'border-indigo-500'
                        : isOtherPane
                          ? 'border-neutral-600'
                          : 'border-neutral-800 opacity-60'
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
