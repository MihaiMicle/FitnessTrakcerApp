"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import LoginForm from "@/components/auth/LoginForm";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if the user is already logged in on initial page load
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace("/");
        router.refresh();
      } else {
        setLoading(false);
      }
    });

    // Actively listen for sign-in events triggered inside <LoginForm />
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        router.replace("/");
        router.refresh(); // Crucial: forces Next.js App Router to clear its cached layouts!
      }
    });

    // Clean up the listener when the component unmounts
    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  if (loading) {
    return (
      <main className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-6">
        <div className="font-mono text-sm text-neutral-400">
          Checking session...
        </div>
      </main>
    );
  }

  // Render the reusable login/signup form we extracted earlier
  return <LoginForm />;
}
