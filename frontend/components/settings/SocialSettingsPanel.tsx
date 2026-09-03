'use client';
import { useState, useEffect } from 'react';
import {
  getSocialSettings,
  updateSocialSettings,
  checkUsernameAvailable,
} from '@/lib/social/api';
import { SocialSettings } from '@/types/social';
import toast from 'react-hot-toast';
import { AtSign } from 'lucide-react';

export default function SocialSettingsPanel() {
  const [settings, setSettings] = useState<SocialSettings | null>(null);
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    getSocialSettings()
      .then((data) => {
        setSettings(data);
        setUsername(data.username || '');
        setBio(data.bio || '');
        setIsPrivate(data.is_private);
      })
      .catch(console.error);
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (username && username !== settings?.username) {
        const check = await checkUsernameAvailable(username);
        if (!check.available) {
          toast.error(check.reason || 'Username taken');
          setIsSaving(false);
          return;
        }
      }

      const updated = await updateSocialSettings({
        username: username || undefined,
        bio,
        is_private: isPrivate,
      });
      setSettings(updated);
      toast.success('Social settings updated!');
    } catch (e: any) {
      toast.error(e.message || 'Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (!settings)
    return <div className="animate-pulse h-32 bg-neutral-900 rounded-xl" />;

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 shadow-sm space-y-4">
      <div>
        <label className="text-xs text-neutral-400 block mb-1 font-mono uppercase tracking-wider">
          Public Handle
        </label>
        <div className="relative">
          <AtSign
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"
          />
          <input
            type="text"
            value={username}
            onChange={(e) =>
              setUsername(
                e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''),
              )
            }
            placeholder="username"
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg py-2 pl-9 pr-3 text-sm text-white focus:border-indigo-500 outline-none transition-colors font-mono"
          />
        </div>
      </div>

      <div>
        <label className="text-xs text-neutral-400 block mb-1 font-mono uppercase tracking-wider">
          Bio
        </label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Tell people about your goals..."
          rows={2}
          className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-sm text-white focus:border-indigo-500 outline-none transition-colors font-mono resize-none"
        />
      </div>

      <div className="flex items-center justify-between p-3 bg-neutral-950 rounded-lg border border-neutral-800">
        <div>
          <p className="text-sm font-bold text-white">Private Account</p>
          <p className="text-xs text-neutral-500 font-mono mt-0.5">
            Only approved followers see your posts.
          </p>
        </div>
        <button
          onClick={() => setIsPrivate(!isPrivate)}
          className={`w-11 h-6 rounded-full transition-colors relative ${isPrivate ? 'bg-indigo-500' : 'bg-neutral-700'}`}
        >
          <span
            className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${isPrivate ? 'translate-x-5' : 'translate-x-0'}`}
          />
        </button>
      </div>

      <button
        onClick={handleSave}
        disabled={isSaving || !username}
        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-xs font-mono transition-colors disabled:opacity-50"
      >
        {isSaving ? 'Saving...' : 'Save Social Settings'}
      </button>
    </div>
  );
}
