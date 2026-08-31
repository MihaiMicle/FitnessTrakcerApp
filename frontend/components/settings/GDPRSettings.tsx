'use client';

import { useState } from 'react';
import { Download, AlertTriangle, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { useConfirm } from '@/components/shared/useConfirm';
import ConfirmModal from '@/components/shared/ConfirmModal';

export default function GDPRSettings() {
  const [isExporting, setIsExporting] = useState(false);
  const confirm = useConfirm();

  const handleExportData = async () => {
    setIsExporting(true);
    toast.loading('Compiling your data...', { id: 'export' });

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/profile/me/export`,
        {
          headers: { Authorization: `Bearer ${session.access_token}` },
        },
      );

      if (!res.ok) throw new Error('Failed to generate export');

      // Convert response to a downloadable JSON file
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'fitness_tracker_data_export.json';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);

      toast.success('Export downloaded!', { id: 'export' });
    } catch (error) {
      toast.error('Could not export data.', { id: 'export' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleSignOutClick = () => {
    confirm.ask({
      title: 'SIGN OUT',
      message: 'Are you sure you want to sign out of your account?',
      confirmText: 'Sign Out',
      isDestructive: false,
      action: async () => {
        try {
          await supabase.auth.signOut();
          window.location.href = '/login';
        } catch (error) {
          toast.error('Failed to sign out');
        }
      },
    });
  };

  const handleDeleteAccount = () => {
    confirm.ask({
      title: 'DELETE ACCOUNT',
      message:
        'This will permanently delete your profile, all workout history, custom foods, and nutrition logs. This action cannot be undone.',
      confirmText: 'Delete Everything',
      isDestructive: true,
      action: async () => {
        toast.loading('Deleting account...', { id: 'delete-acc' });
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (!session) return;

          // Your existing backend delete endpoint
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/profile/me`,
            {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${session.access_token}` },
            },
          );

          if (!res.ok) throw new Error('Deletion failed');

          await supabase.auth.signOut();
          toast.success('Account permanently deleted', { id: 'delete-acc' });
          window.location.href = '/login';
        } catch (error) {
          toast.error('Failed to delete account', { id: 'delete-acc' });
        }
      },
    });
  };

  return (
    <>
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 shadow-sm space-y-6">
        <div>
          <h3 className="text-lg font-bold text-white tracking-tight">
            Data & Privacy (GDPR)
          </h3>
          <p className="text-sm text-neutral-400 font-mono mt-1">
            Download a machine-readable copy of your data or permanently erase
            your account.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleExportData}
            disabled={isExporting}
            className="flex-1 flex items-center justify-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-3 rounded-lg font-bold font-mono text-sm transition-colors disabled:opacity-50"
          >
            <Download size={16} />
            {isExporting ? 'Packaging...' : 'Export All Data'}
          </button>

          <button
            onClick={handleSignOutClick}
            className="flex-1 flex items-center justify-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 px-4 py-3 rounded-lg font-bold font-mono text-sm transition-colors"
          >
            <LogOut size={16} />
            Sign Out
          </button>

          <button
            onClick={handleDeleteAccount}
            className="flex-1 flex items-center justify-center gap-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 px-4 py-3 rounded-lg font-bold font-mono text-sm transition-colors"
          >
            <AlertTriangle size={16} />
            Delete Account
          </button>
        </div>
      </div>
      <ConfirmModal {...confirm.modalProps} />
    </>
  );
}
