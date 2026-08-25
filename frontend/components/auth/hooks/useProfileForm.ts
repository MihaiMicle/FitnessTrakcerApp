'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';

export type UnitSystem = 'metric' | 'imperial';

export interface ProfileFormState {
  firstName: string;
  lastName: string;
  weight: number | '';
  height: number | '';
  birthDate: string;
  gender: 'male' | 'female';
  bodyFat: number | '';
  activityLevel: number;
  goalType: string;
  avatarUrl: string;
}

const EMPTY_PROFILE: ProfileFormState = {
  firstName: '',
  lastName: '',
  weight: '',
  height: '',
  birthDate: '',
  gender: 'male',
  bodyFat: '',
  activityLevel: 1.2,
  goalType: 'maintain',
  avatarUrl: '',
};

const LBS_PER_KG = 2.20462;
const CM_PER_INCH = 2.54;

const profileUrl = () => `${process.env.NEXT_PUBLIC_API_URL}/profile/me`;

/** Normalises the API's birth_date into the yyyy-mm-dd an <input type="date"> needs. */
function toDateInputValue(value: unknown): string {
  const raw = String(value ?? '');
  const match = raw.match(/(\d{4}-\d{2}-\d{2})/);
  if (match) return match[0];

  const parsed = new Date(raw);
  if (isNaN(parsed.getTime())) return '';

  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${parsed.getFullYear()}-${month}-${day}`;
}

export function calculateAge(dob: string): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDelta = today.getMonth() - birth.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birth.getDate()))
    age--;
  return age;
}

interface UseProfileFormOptions {
  onProfileUpdate?: (avatarUrl: string) => void;
  onClose: () => void;
}

/**
 * All the state and I/O behind the profile modal: loading the profile,
 * unit conversion, avatar upload, saving and account deletion.
 */
export function useProfileForm(
  isOpen: boolean,
  { onProfileUpdate, onClose }: UseProfileFormOptions,
) {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileFormState>(EMPTY_PROFILE);
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('metric');
  const [saving, setSaving] = useState(false);

  const update = useCallback(
    <K extends keyof ProfileFormState>(key: K, value: ProfileFormState[K]) =>
      setProfile((prev) => ({ ...prev, [key]: value })),
    [],
  );

  useEffect(() => {
    if (!isOpen) return;

    const fetchProfile = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) return;

        const res = await fetch(profileUrl(), {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!res.ok) return;

        const data = await res.json();
        setProfile({
          firstName: data.first_name || '',
          lastName: data.last_name || '',
          weight: data.weight_kg || '',
          height: data.height_cm || '',
          birthDate: data.birth_date ? toDateInputValue(data.birth_date) : '',
          gender: data.gender || 'male',
          bodyFat: data.body_fat_percentage || '',
          activityLevel: data.activity_level || 1.2,
          goalType: data.goal_type || 'maintain',
          avatarUrl: data.avatar_url || '',
        });
        setUnitSystem('metric');
      } catch (error) {
        console.error('Failed to load profile', error);
      }
    };

    fetchProfile();
  }, [isOpen]);

  /** Converts the displayed weight/height when the user switches systems. */
  const changeUnitSystem = useCallback(
    (next: UnitSystem) => {
      setUnitSystem((current) => {
        if (next === current) return current;

        const toImperial = next === 'imperial';
        setProfile((prev) => ({
          ...prev,
          weight:
            prev.weight === ''
              ? ''
              : Number(
                  (toImperial
                    ? Number(prev.weight) * LBS_PER_KG
                    : Number(prev.weight) / LBS_PER_KG
                  ).toFixed(1),
                ),
          height:
            prev.height === ''
              ? ''
              : Number(
                  (toImperial
                    ? Number(prev.height) / CM_PER_INCH
                    : Number(prev.height) * CM_PER_INCH
                  ).toFixed(1),
                ),
        }));
        return next;
      });
    },
    [],
  );

  const uploadAvatar = useCallback(
    async (file: File) => {
      toast.loading('Uploading photo...', { id: 'upload' });
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          toast.error('You must be logged in to upload an avatar.', {
            id: 'upload',
          });
          return;
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random()
          .toString(36)
          .substring(2)}.${fileExt}`;
        const filePath = `public/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, file);
        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from('avatars').getPublicUrl(filePath);

        update('avatarUrl', publicUrl);
        onProfileUpdate?.(publicUrl);

        await fetch(profileUrl(), {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ avatar_url: publicUrl }),
        });

        toast.success('Photo updated successfully!', { id: 'upload' });
      } catch (error) {
        console.error('Error uploading avatar:', error);
        toast.error('Could not upload image. Please try again.', {
          id: 'upload',
        });
      }
    },
    [onProfileUpdate, update],
  );

  const save = useCallback(async () => {
    try {
      setSaving(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Authentication error. Please log in again.');
        return;
      }

      const isImperial = unitSystem === 'imperial';
      const payload = {
        first_name: profile.firstName,
        last_name: profile.lastName,
        weight_kg:
          isImperial && profile.weight !== ''
            ? Number((Number(profile.weight) / LBS_PER_KG).toFixed(2))
            : Number(profile.weight),
        height_cm:
          isImperial && profile.height !== ''
            ? Number((Number(profile.height) * CM_PER_INCH).toFixed(2))
            : Number(profile.height),
        birth_date: profile.birthDate || null,
        age: profile.birthDate ? calculateAge(profile.birthDate) : null,
        gender: profile.gender,
        activity_level: profile.activityLevel,
        goal_type: profile.goalType,
        avatar_url: profile.avatarUrl,
        body_fat_percentage:
          profile.bodyFat === '' ? null : Number(profile.bodyFat),
      };

      const res = await fetch(profileUrl(), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Server returned an error');

      toast.success('Profile saved successfully!');
      onClose();
      router.refresh();
    } catch (error) {
      console.error('Failed to save profile:', error);
      toast.error('Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [profile, unitSystem, onClose, router]);

  const deleteAccount = useCallback(async () => {
    setSaving(true);
    toast.loading('Deleting account...', { id: 'deleteAccount' });
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(profileUrl(), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!res.ok) {
        const errText = await res.text();
        toast.error(`Backend Error: ${errText || 'Route missing'}`, {
          id: 'deleteAccount',
        });
        setSaving(false);
        return;
      }

      await supabase.auth.signOut();
      toast.success('Account deleted successfully.', { id: 'deleteAccount' });
      onClose();
      router.replace('/login');
    } catch {
      toast.error('Network failed. Is the backend running?', {
        id: 'deleteAccount',
      });
      setSaving(false);
    }
  }, [onClose, router]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  }, [router]);

  return {
    profile,
    update,
    unitSystem,
    changeUnitSystem,
    saving,
    uploadAvatar,
    save,
    deleteAccount,
    signOut,
  };
}

export type ProfileFormApi = ReturnType<typeof useProfileForm>;
