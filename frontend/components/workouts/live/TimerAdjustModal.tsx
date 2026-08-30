'use client';

interface TimerAdjustModalProps {
  elapsed: number;
  isPaused: boolean;
  onOverride: (seconds: number) => void;
  onTogglePause: () => void;
  onClose: () => void;
}

export default function TimerAdjustModal({
  elapsed,
  isPaused,
  onOverride,
  onTogglePause,
  onClose,
}: TimerAdjustModalProps) {
  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = elapsed % 60;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-sm p-6 space-y-6 shadow-2xl animate-in zoom-in-95">
        <h3 className="text-xl font-bold text-white tracking-tight">
          Adjust Timer
        </h3>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-neutral-400 font-mono mb-2 flex justify-between">
              <span>Hours</span>
              <span className="text-white">{hours}h</span>
            </label>
            <input
              type="range"
              min="0"
              max="5"
              value={hours}
              onChange={(e) =>
                onOverride(Number(e.target.value) * 3600 + (elapsed % 3600))
              }
              className="w-full accent-indigo-500"
            />
          </div>

          <div>
            <label className="text-xs text-neutral-400 font-mono mb-2 flex justify-between">
              <span>Minutes</span>
              <span className="text-white">{minutes}m</span>
            </label>
            <input
              type="range"
              min="0"
              max="59"
              value={minutes}
              onChange={(e) =>
                onOverride(hours * 3600 + Number(e.target.value) * 60 + seconds)
              }
              className="w-full accent-indigo-500"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={() => {
              onTogglePause();
              onClose();
            }}
            className={`flex-1 py-3 font-bold rounded-xl font-mono text-xs transition-colors text-white ${isPaused ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-amber-600 hover:bg-amber-500'}`}
          >
            {isPaused ? 'Resume Timer' : 'Pause Timer'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl font-mono text-xs transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
