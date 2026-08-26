'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { convertHeicToJpeg, isHeic, resolveImageType } from '@/lib/images';
import { supabase } from '@/lib/supabase';

const weightUrl = (suffix = '') =>
  `${process.env.NEXT_PUBLIC_API_URL}/profile/weight${suffix}`;

/* Loads weight logs and handles editing, deleting and attaching photos */
export function useWeightHistory(isOpen: boolean) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [hasChanges, setHasChanges] = useState(false);

  // Object URLs so a new photo shows instantly, before the server round-trip
  const [localPreviews, setLocalPreviews] = useState<Record<string, string>>(
    {},
  );

  useEffect(() => {
    if (!isOpen) return;

    const fetchLogs = async () => {
      setLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(weightUrl(), {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res.ok) setLogs(await res.json());
      setLoading(false);
    };

    fetchLogs();
  }, [isOpen, refreshKey]);

  const markChanged = useCallback(() => {
    setRefreshKey((k) => k + 1);
    setHasChanges(true);
  }, []);

  /* Upserts a weight log; used by both the inline edit and photo upload */
  const upsertLog = useCallback(
    async (
      accessToken: string,
      body: { date: string; weight_kg: number; photo_url?: string },
    ) =>
      fetch(weightUrl(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
      }),
    [],
  );

  const uploadPhoto = useCallback(
    async (date: string, weight_kg: number, file: File) => {
      let upload = file;

      if (isHeic(file)) {
        toast.loading('Converting Apple photo...', { id: 'upload' });
        try {
          upload = await convertHeicToJpeg(file);
        } catch {
          toast.error(
            'Failed to convert iPhone photo. Try a different image.',
            { id: 'upload' },
          );
          return;
        }
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      setLocalPreviews((prev) => ({
        ...prev,
        [date]: URL.createObjectURL(upload),
      }));

      const { mimeType, extension } = resolveImageType(upload);
      const fileName = `physique-${session.user.id}-${date}-${Date.now()}.${extension}`;

      toast.loading('Uploading photo...', { id: 'upload' });

      try {
        const { error: uploadError } = await supabase.storage
          .from('physique_photos')
          .upload(fileName, await upload.arrayBuffer(), {
            upsert: true,
            contentType: mimeType,
          });

        if (uploadError) {
          toast.error('Upload failed: ' + uploadError.message, {
            id: 'upload',
          });
          return;
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from('physique_photos').getPublicUrl(fileName);

        const res = await upsertLog(session.access_token, {
          date,
          weight_kg,
          photo_url: publicUrl,
        });

        if (!res.ok) {
          toast.error('Failed to save photo link to database', {
            id: 'upload',
          });
          return;
        }

        toast.success('Photo saved successfully!', { id: 'upload' });
        markChanged();
      } catch {
        toast.error('An unexpected error occurred', { id: 'upload' });
      }
    },
    [markChanged, upsertLog],
  );

  const updateWeight = useCallback(
    async (log: any, weight: number) => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) return false;

        const res = await upsertLog(session.access_token, {
          date: log.date,
          weight_kg: weight,
          photo_url: log.photo_url,
        });

        if (!res.ok) {
          toast.error('Failed to update weight.');
          return false;
        }

        toast.success('Weight updated!');
        markChanged();
        return true;
      } catch {
        toast.error('An error occurred while updating.');
        return false;
      }
    },
    [markChanged, upsertLog],
  );

  // Add a brand new weight log
  const addWeight = useCallback(
    async (date: string, weight: number) => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) return false;

        const res = await upsertLog(session.access_token, {
          date,
          weight_kg: weight,
        });

        if (!res.ok) {
          toast.error('Failed to log weight.');
          return false;
        }

        toast.success('Weight logged!');
        markChanged();
        return true;
      } catch {
        toast.error('An error occurred.');
        return false;
      }
    },
    [markChanged, upsertLog],
  );

  const deleteLog = useCallback(
    async (logId: string) => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) return;

        const res = await fetch(weightUrl(`/${logId}`), {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${session.access_token}` },
        });

        if (!res.ok) {
          toast.error('Failed to delete log.');
          return;
        }

        toast.success('Weight log deleted!');
        markChanged();
      } catch {
        toast.error('An error occurred while deleting.');
      }
    },
    [markChanged],
  );

  return {
    logs,
    loading,
    hasChanges,
    localPreviews,
    uploadPhoto,
    updateWeight,
    addWeight,
    deleteLog,
  };
}
