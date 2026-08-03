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
import GoalsModal from "@/components/dashboard/GoalsModal";
import ProfileModal from "@/components/dashboard/ProfileModal";

export default function Dashboard() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGoalsModalOpen, setIsGoalsModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");
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
    // Create a helper to fetch the profile on load
    const fetchDashboardProfile = async (token: string) => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/profile/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.avatar_url) setAvatarUrl(data.avatar_url);
        }
      } catch (err) {
        console.error("Failed to load initial avatar", err);
      }
    };

    // Call it when session initializes
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
      if (session) fetchDashboardProfile(session.access_token);
    });

    // Call it on auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setAuthLoading(false);
      if (session) fetchDashboardProfile(session.access_token);
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

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 p-6 md:p-12 relative">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* HEADER SECTION */}
        <header className="border-b border-neutral-800 pb-6 flex justify-between items-center">
          
          {/* Avatar + Title block */}
          <div className="flex items-center gap-4">
            
            {/* Profile Button */}
            <button 
              onClick={() => setIsProfileModalOpen(true)}
              className="flex-shrink-0 w-12 h-12 rounded-full bg-neutral-900 border border-neutral-700 flex items-center justify-center hover:bg-neutral-800 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 overflow-hidden shadow-md"
              title="Open Profile Settings"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <svg className="w-6 h-6 text-neutral-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              )}
            </button>

            {/* Title & Secondary Buttons */}
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl font-bold tracking-tight">
                  Daily Nutrition Dashboard
                </h1>

                <button
                  onClick={() => setIsGoalsModalOpen(true)}
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
              <p className="text-neutral-400 text-sm">Date: {TODAY}</p>
            </div>
          </div>

          {/* Log Meal */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm h-fit"
          >
            <span>+</span> Log Meal
          </button>
        </header>

        {/* DASHBOARD CONTENT */}
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

      {/* MODALS */}
      <LogMealModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAddMeal={addMeal}
      />

      <GoalsModal
        isOpen={isGoalsModalOpen}
        onClose={() => setIsGoalsModalOpen(false)}
        onUpdateSuccess={() => {
          if (refreshLog) refreshLog();
        }}
      />

      <ProfileModal 
        isOpen={isProfileModalOpen} 
        onClose={() => setIsProfileModalOpen(false)}
        onProfileUpdate={(newUrl) => setAvatarUrl(newUrl)} 
      />
    </main>
  );
}