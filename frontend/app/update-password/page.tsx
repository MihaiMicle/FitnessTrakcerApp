"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import PasswordField from "@/components/auth/PasswordField";
import toast from "react-hot-toast";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);

  useEffect(() => {
    // When they click the email link, Supabase logs them in automatically.
    // We check for that session to ensure they have the right to be on this page.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        toast.error("Invalid or expired password reset link.");
        router.replace("/login");
      } else {
        setAuthChecking(false);
      }
    });
  }, [router]);

  const handleUpdatePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;

      toast.success("Password updated successfully!");
      router.replace("/"); // Send them to the dashboard!
    } catch (err: any) {
      toast.error(err.message || "Failed to update password.");
    } finally {
      setLoading(false);
    }
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-emerald-500 font-mono text-sm animate-pulse">
        Verifying secure link...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-6">
      <div className="bg-neutral-900 border border-emerald-500/50 rounded-xl p-8 max-w-sm w-full space-y-6 shadow-2xl animate-in zoom-in-95 fade-in">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-emerald-400">
            Secure Reset
          </h1>
          <p className="text-neutral-400 text-xs mt-2 leading-relaxed font-mono">
            Your identity has been verified. Please enter your new password
            below.
          </p>
        </div>

        <form onSubmit={handleUpdatePassword} className="space-y-5">
          <div>
            <label className="text-xs text-neutral-400 block mb-1 font-mono">
              New Password
            </label>
            <PasswordField
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !newPassword}
            className="w-full py-2.5 rounded-lg font-mono text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save New Password"}
          </button>
        </form>
      </div>
    </main>
  );
}
