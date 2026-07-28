"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Session } from "@supabase/supabase-js";
import { useDailyLog } from "@/hooks/useDailyLog";
import { MEAL_TYPES, MEAL_TYPE_LABELS } from "@/lib/constants";
import MacroGoals from "@/components/dashboard/MacroGoals";
import MealGroup from "@/components/dashboard/MealGroup";
import LogMealModal from "@/components/meals/LogMealModal";
import ProfileModal from "@/components/dashboard/ProfileModal";

export default function Dashboard() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false); // <-- 1. Added Profile Modal State

  const TODAY = new Date().toISOString().split("T")[0];

  // If session is null, pass "" so useDailyLog stays dormant until authenticated!
  const {
    dailyLog,
    loading: logLoading,
    addMeal,
    removeMeal,
    refreshLog,
  } = useDailyLog(session ? TODAY : "");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Handle routing side-effects inside useEffect, NOT during render!
  useEffect(() => {
    if (!authLoading && !session) {
      router.replace("/login");
    }
  }, [authLoading, session, router]);

  if (authLoading) {
    return <div className="p-8 text-white font-mono">Checking session...</div>;
  }

  if (!session) {
    return null; // Render nothing while the useEffect above redirects to /login
  }

  if (logLoading) {
    return (
      <div className="p-8 text-white font-mono">
        Loading nutrition engine...
      </div>
    );
  }

  console.log("Current Daily Log Payload:", dailyLog);

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 p-6 md:p-12 relative">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="border-b border-neutral-800 pb-6 flex justify-between items-end">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">
                Daily Nutrition Dashboard
              </h1>

              {/* Goals Trigger Button */}
              <button
                onClick={() => setIsProfileModalOpen(true)}
                className="text-xs bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white px-2.5 py-1 rounded transition-colors"
              >
                Goals
              </button>

              <button
                onClick={() => supabase.auth.signOut()}
                className="text-xs bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white px-2.5 py-1 rounded transition-colors"
              >
                Sign Out
              </button>
            </div>
            <p className="text-neutral-400 text-sm mt-1">Date: {TODAY}</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm"
          >
            <span>+</span> Log Meal
          </button>
        </header>

        <MacroGoals summary={dailyLog} />

        <div className="space-y-6 mt-8">
          {MEAL_TYPES.map((type) => {
            const mealsForCategory = (dailyLog?.meals || []).filter(
              (m) => m.meal_type?.toLowerCase() === type,
            );
            return (
              <MealGroup
                key={type}
                label={MEAL_TYPE_LABELS[type]}
                meals={mealsForCategory}
                onDeleteMeal={removeMeal}
              />
            );
          })}
        </div>
      </div>

      <LogMealModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAddMeal={addMeal}
      />

      {/* Rendered the Profile Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onUpdateSuccess={() => {
          if (refreshLog) refreshLog();
        }}
      />
    </main>
  );
}
