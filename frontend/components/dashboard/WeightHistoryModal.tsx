'use client';

import { useState } from 'react';
import CameraModal from '@/components/shared/CameraModal';
import DeleteWeightLogModal from './DeleteWeightLogModal';
import ProgressGallery from './ProgressGallery';
import WeightHistoryChart from './WeightHistoryChart';
import WeightLogCard from './WeightLogCard';
import { useWeightHistory } from './hooks/useWeightHistory';

interface WeightHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WeightHistoryModal({
  isOpen,
  onClose,
}: WeightHistoryModalProps) {
  const history = useWeightHistory(isOpen);

  const [showWebcam, setShowWebcam] = useState(false);
  const [cameraTarget, setCameraTarget] = useState<{
    date: string;
    weight_kg: number;
  } | null>(null);

  const [showGallery, setShowGallery] = useState(false);

  const [logToDelete, setLogToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen) return null;

  // Edit here feed the dashboard's own weight state, so reload to resync
  const handleClose = () => {
    if (history.hasChanges) window.location.reload();
    else onClose();
  };

  const confirmDelete = async () => {
    if (!logToDelete) return;
    setIsDeleting(true);
    await history.deleteLog(logToDelete);
    setIsDeleting(false);
    setLogToDelete(null);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg max-w-3xl w-full p-6 text-white font-sans relative my-8 shadow-2xl max-h-[85vh] flex flex-col">
          <div className="flex justify-between items-center border-b border-neutral-800 pb-4 mb-6 shrink-0">
            <h2 className="text-lg font-bold font-mono tracking-wider">
              PHYSIQUE HISTORY
            </h2>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowGallery(true)}
                disabled={!history.logs.some((log) => log.photo_url)}
                className="px-3 py-1.5 rounded-lg bg-neutral-950 border border-neutral-800 text-xs font-mono text-neutral-300 hover:text-white disabled:opacity-40 transition-colors"
              >
                Gallery
              </button>
              <button
                onClick={handleClose}
                className="text-neutral-400 hover:text-white font-mono text-sm px-2"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6">
            <WeightHistoryChart logs={history.logs} loading={history.loading} />

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {history.logs
                .slice()
                .reverse()
                .map((log) => (
                  <WeightLogCard
                    key={log.id}
                    log={log}
                    previewUrl={history.localPreviews[log.date]}
                    onSaveWeight={history.updateWeight}
                    onDelete={setLogToDelete}
                    onUploadPhoto={history.uploadPhoto}
                    onOpenCamera={(target) => {
                      setCameraTarget(target);
                      setShowWebcam(true);
                    }}
                  />
                ))}
            </div>
          </div>
        </div>
      </div>

      <CameraModal
        isOpen={showWebcam}
        onClose={() => {
          setShowWebcam(false);
          setCameraTarget(null);
        }}
        onCapture={(file) => {
          if (cameraTarget)
            history.uploadPhoto(
              cameraTarget.date,
              cameraTarget.weight_kg,
              file,
            );
        }}
        title="CAPTURE PROGRESS"
        initialFacingMode="environment"
      />

      <ProgressGallery
        isOpen={showGallery}
        onClose={() => setShowGallery(false)}
        logs={history.logs}
      />

      <DeleteWeightLogModal
        isOpen={!!logToDelete}
        isDeleting={isDeleting}
        onCancel={() => setLogToDelete(null)}
        onConfirm={confirmDelete}
      />
    </>
  );
}
