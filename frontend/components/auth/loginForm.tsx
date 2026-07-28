"use client";

import { useState, FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import PasswordField from "@/components/auth/PasswordField";

export default function LoginForm() {
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);

  const handleAuth = async (e: FormEvent) => {
    e.preventDefault();
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email: authEmail,
          password: authPassword,
        });
        if (error) throw error;
        alert("Check your email for the confirmation link!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password: authPassword,
        });
        if (error) throw error;
      }
    } catch (err: any) {
      alert(err.message || "Authentication error");
    }
  };

  return (
    <main className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-6">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-8 max-w-sm w-full space-y-6 shadow-2xl">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">Fitness Tracker</h1>
          <p className="text-neutral-400 text-xs mt-1">
            Sign in to access your daily dashboard
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="text-xs text-neutral-400 block mb-1">Email</label>
            <input
              type="email"
              required
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2.5 text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="text-xs text-neutral-400 block mb-1">
              Password
            </label>
            <PasswordField
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2.5 rounded-lg text-sm transition-colors mt-2"
          >
            {isSignUp ? "Create Account" : "Sign In"}
          </button>
        </form>

        <div className="text-center">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-xs text-neutral-400 hover:text-white underline transition-colors"
          >
            {isSignUp
              ? "Already have an account? Sign In"
              : "Need an account? Sign Up"}
          </button>
        </div>
      </div>
    </main>
  );
}
