'use client';

import { useEffect, useState } from 'react';
import CameraModal from '@/components/shared/CameraModal';
import ConfirmModal from '@/components/shared/ConfirmModal';
import { LockIcon, SignOutIcon } from '@/components/shared/icons';
import { useConfirm } from '@/components/shared/useConfirm';
import { useProfileForm } from './hooks/useProfileForm';
import AvatarPicker from './profile/AvatarPicker';
import {
  ActivityGoalsSection,
  PersonalDetailsSection,
  PhysicalMetricsSection,
} from './profile/ProfileFields';
import { useRouter } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProfileUpdate?: (avatarUrl: string) => void;
  onOpenSecurity: () => void;
}

export default function ProfileModal({
  isOpen,
  onClose,
  onProfileUpdate,
  onOpenSecurity,
}: ProfileModalProps) {
  const [showWebcam, setShowWebcam] = useState(false);
  const form = useProfileForm(isOpen, { onProfileUpdate, onClose });
  const confirm = useConfirm();
  const router = useRouter();

  useEffect(() => {
    if (!isOpen) {
      setShowWebcam(false);
      confirm.close();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const askDeleteAccount = () =>
    confirm.ask({
      title: 'DELETE ACCOUNT',
      message:
        'Are you absolutely sure you want to permanently delete your account and all associated data? This action cannot be undone.',
      confirmText: 'Delete My Account',
      isDestructive: true,
      action: form.deleteAccount,
    });

  return (
    <>
      {/* Container switches from items-center to items-end on mobile */}
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto">
        <div className="bg-neutral-900 border-t sm:border border-neutral-800 rounded-t-2xl sm:rounded-xl max-w-3xl w-full p-5 sm:p-6 text-white font-sans relative shadow-2xl max-h-[90dvh] sm:max-h-[85vh] flex flex-col">
          {/* Header (Pinned) */}
          <div className="flex justify-between items-center border-b border-neutral-800 pb-4 mb-4 shrink-0">
            <h2 className="text-lg font-bold font-mono tracking-wider">
              PROFILE SETTINGS
            </h2>
            <div className="flex items-center gap-4 sm:gap-5">
              <button
                onClick={onClose}
                className="text-neutral-400 hover:text-white font-mono text-xl sm:text-sm ml-1"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Body (Scrollable) */}
          <div className="flex-1 space-y-6 overflow-y-auto pr-2 custom-scrollbar">
            <PersonalDetailsSection form={form}>
              <AvatarPicker
                avatarUrl={form.profile.avatarUrl}
                onFileSelected={form.uploadAvatar}
                onOpenCamera={() => setShowWebcam(true)}
              />
            </PersonalDetailsSection>

            <PhysicalMetricsSection form={form} />

            <ActivityGoalsSection form={form} />

            <div className="pt-2 pb-4 space-y-3">
              <button
                type="button"
                onClick={onOpenSecurity}
                className="w-full py-3 rounded-lg border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 font-mono text-xs transition-colors flex items-center justify-center gap-2"
              >
                <LockIcon />
                Manage Account Security (Email &amp; Password)
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  router.push('/settings');
                }}
                className="w-full py-3 rounded-lg border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 font-mono text-xs transition-colors flex items-center justify-center gap-2"
              >
                <ShieldAlert size={14} className="text-neutral-400" />
                Privacy, Data &amp; Advanced Settings
              </button>
            </div>
          </div>

          {/* Footer (Pinned) */}
          <div className="flex justify-end pt-5 border-t border-neutral-800 mt-2 shrink-0">
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded font-mono text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition text-center"
              >
                Cancel
              </button>
              <button
                onClick={form.save}
                disabled={form.saving}
                className="px-4 py-2 rounded font-mono text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition disabled:opacity-50 text-center"
              >
                {form.saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <CameraModal
        isOpen={showWebcam}
        onClose={() => setShowWebcam(false)}
        onCapture={form.uploadAvatar}
        title="CAPTURE PHOTO"
        initialFacingMode="user"
      />

      <ConfirmModal {...confirm.modalProps} />
    </>
  );
}
