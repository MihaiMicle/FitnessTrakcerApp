'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft, User, ShieldAlert, HeartPulse } from 'lucide-react';
import GDPRSettings from '@/components/settings/GDPRSettings';
import HealthSyncPanel from '@/components/health/HealthSyncPanel';

export default function SettingsPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 p-4 sm:p-6 md:p-12 pb-24 relative">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <header className="border-b border-neutral-800 pb-6 flex items-center gap-3">
          <button
            onClick={() => router.push('/?profile=open')}
            className="text-neutral-500 hover:text-white transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Settings
          </h1>
        </header>

        {/* Section 1: Account */}
        <section className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <User className="text-emerald-400" size={20} />
            <h2 className="text-lg font-bold text-white tracking-tight">
              Account & Profile
            </h2>
          </div>
          <p className="text-sm text-neutral-400 font-mono mb-4">
            Update your body metrics, goals, and personal details.
          </p>
          <button
            onClick={() => router.push('/')} // This redirects to the dashboard where they can open the Profile modal
            className="bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2 rounded-lg font-mono text-sm transition-colors"
          >
            Edit Profile Metrics
          </button>
        </section>

        {/* Section 2: Health & Devices */}
        <section>
          <div className="flex items-center gap-3 mb-4 px-1">
            <HeartPulse className="text-emerald-400" size={20} />
            <h2 className="text-lg font-bold text-white tracking-tight">
              Health &amp; Devices
            </h2>
          </div>
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 shadow-sm">
            <HealthSyncPanel />
          </div>
        </section>

        {/* Section 3: Privacy & GDPR */}
        <section>
          <div className="flex items-center gap-3 mb-4 px-1">
            <ShieldAlert className="text-rose-400" size={20} />
            <h2 className="text-lg font-bold text-white tracking-tight">
              Privacy & Data
            </h2>
          </div>
          <GDPRSettings />
        </section>
      </div>
    </main>
  );
}
