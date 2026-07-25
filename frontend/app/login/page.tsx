"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import LoginForm from "@/components/auth/LoginForm";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if the user is already authenticated
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // If they are already logged in, redirect them to the dashboard!
        router.replace("/");
      } else {
        setLoading(false);
      }
    });
  }, [router]);

  if (loading) {
    return (
      <main className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-6">
        <div className="font-mono text-sm text-neutral-400">Checking session...</div>
      </main>
    );
  }

  // Render the reusable login/signup form we extracted earlier
  return <LoginForm />;
}