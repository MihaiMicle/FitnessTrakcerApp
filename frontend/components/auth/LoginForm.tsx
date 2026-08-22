"use client";

import { useState, FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import PasswordField from "@/components/auth/PasswordField";
import toast from "react-hot-toast";

export default function LoginForm() {
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  // States to manage the Forgot Password flow
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [emailSentType, setEmailSentType] = useState<"signup" | "reset" | null>(
    null,
  );

  const handleAuth = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email: authEmail,
          password: authPassword,
        });
        if (error) throw error;

        setEmailSentType("signup");
        toast.success("Verification email sent!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password: authPassword,
        });
        if (error) throw error;
      }
    } catch (err: any) {
      toast.error(err.message || "Authentication error");
    } finally {
      setLoading(false);
    }
  };

  // Handle sending the password reset link
  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(authEmail, {
        redirectTo: `${window.location.origin}/update-password`,
      });
      if (error) throw error;

      setEmailSentType("reset");
      toast.success("Password reset link sent!");
    } catch (err: any) {
      toast.error(err.message || "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  // Custom success screen (handles both Verification and Password Reset)
  if (emailSentType) {
    const isReset = emailSentType === "reset";
    return (
      <main className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-6">
        <div className="bg-neutral-900 border border-emerald-500/30 rounded-xl p-8 max-w-sm w-full space-y-6 shadow-2xl text-center animate-in zoom-in-95 fade-in">
          <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
            <span className="text-2xl">✉️</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-emerald-400">
            Check your inbox
          </h2>
          <p className="text-neutral-400 text-sm leading-relaxed">
            We just sent a {isReset ? "password reset" : "verification"} link to{" "}
            <strong className="text-white">{authEmail}</strong>.
          </p>
          <p className="text-neutral-500 text-xs">
            {isReset
              ? "Click the link to securely log back in, then open your Profile Settings to set a new password."
              : "Click the link in the email to activate your account and start setting up your fitness goals."}
          </p>
          <div className="pt-4 border-t border-neutral-800 mt-6">
            <button
              onClick={() => {
                setEmailSentType(null);
                setIsSignUp(false);
                setIsForgotPassword(false);
                setAuthPassword("");
              }}
              className="text-xs text-neutral-400 hover:text-white transition-colors"
            >
              ← Back to Sign In
            </button>
          </div>
        </div>
      </main>
    );
  }

  // Forgot Password View
  if (isForgotPassword) {
    return (
      <main className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-6">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-8 max-w-sm w-full space-y-6 shadow-2xl animate-in fade-in">
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">
              Reset Password
            </h1>
            <p className="text-neutral-400 text-xs mt-1">
              Enter your email to receive a recovery link
            </p>
          </div>

          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="text-xs text-neutral-400 block mb-1">
                Email
              </label>
              <input
                type="email"
                required
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2.5 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2.5 rounded-lg text-sm transition-colors mt-2 disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
          </form>

          <div className="text-center">
            <button
              onClick={() => setIsForgotPassword(false)}
              className="text-xs text-neutral-400 hover:text-white underline transition-colors"
            >
              Back to Sign In
            </button>
          </div>
        </div>
      </main>
    );
  }

  // Standard Login / Sign Up View
  return (
    <main className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-6">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-8 max-w-sm w-full space-y-6 shadow-2xl animate-in fade-in">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">Fitness Tracker</h1>
          <p className="text-neutral-400 text-xs mt-1">
            {isSignUp
              ? "Create a new account"
              : "Sign in to access your daily dashboard"}
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
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2.5 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs text-neutral-400 block">Password</label>
              {/* Forgot Password Link */}
              {!isSignUp && (
                <button
                  type="button"
                  onClick={() => setIsForgotPassword(true)}
                  className="text-[10px] text-emerald-500 hover:text-emerald-400 transition-colors"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <PasswordField
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2.5 rounded-lg text-sm transition-colors mt-2 disabled:opacity-50"
          >
            {loading
              ? "Processing..."
              : isSignUp
                ? "Create Account"
                : "Sign In"}
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
