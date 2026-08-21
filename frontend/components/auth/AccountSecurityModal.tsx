"use client";

import { useState, useEffect, FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import PasswordField from "@/components/auth/PasswordField";
import toast from "react-hot-toast";

interface AccountSecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AccountSecurityModal({
  isOpen,
  onClose,
}: AccountSecurityModalProps) {
  const [currentEmail, setCurrentEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [loadingEmail, setLoadingEmail] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);

  useEffect(() => {
    if (isOpen) {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user && user.email) {
          setCurrentEmail(user.email);
          setNewEmail(user.email);
        }
      });
      setOldPassword("");
      setNewPassword("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Email Update Logic
  const handleUpdateEmail = async (e: FormEvent) => {
    e.preventDefault();
    if (newEmail === currentEmail) {
      toast.error("This is already your current email.");
      return;
    }

    setLoadingEmail(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;

      toast.success(
        "Verification sent! Check both your old and new email inboxes.",
        { duration: 5000 },
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to update email.");
    } finally {
      setLoadingEmail(false);
    }
  };

  // Password Update Logic
  const handleUpdatePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters.");
      return;
    }

    setLoadingPassword(true);
    try {
      // Pass both the new password and the current password directly to Supabase
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
        current_password: oldPassword,
      });

      if (updateError) throw updateError;

      toast.success("Password updated successfully!");
      setOldPassword("");
      setNewPassword("");
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to update password.");
    } finally {
      setLoadingPassword(false);
    }
  };

  // Forgot Password
  const handleForgotPassword = async () => {
    setLoadingPassword(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        currentEmail,
        {
          redirectTo: `${window.location.origin}/update-password`,
        },
      );
      if (error) throw error;

      toast.success("Secure password recovery link sent to your email!");
      onClose(); // Close the modal so they can go check their email
    } catch (err: any) {
      toast.error(err.message || "Failed to send reset email.");
    } finally {
      setLoadingPassword(false);
    }
  };

  const inputClass =
    "w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-sm text-white focus:border-emerald-500 outline-none transition-colors";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95">
        <div className="flex justify-between items-center border-b border-neutral-800 pb-4 mb-6">
          <h2 className="text-lg font-bold font-mono tracking-wider text-white">
            ACCOUNT SECURITY
          </h2>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white font-mono text-sm px-2 py-1"
          >
            ✕
          </button>
        </div>

        <div className="space-y-8">
          {/* Email Update Form */}
          <form onSubmit={handleUpdateEmail} className="space-y-3">
            <div>
              <label className="text-xs text-neutral-400 block mb-1 font-mono">
                Email Address
              </label>
              <input
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className={inputClass}
              />
            </div>
            <button
              type="submit"
              disabled={loadingEmail || newEmail === currentEmail}
              className="w-full py-2.5 rounded-lg font-mono text-xs font-bold bg-neutral-800 hover:bg-neutral-700 text-white transition-colors disabled:opacity-50"
            >
              {loadingEmail ? "Sending Verification..." : "Update Email"}
            </button>
          </form>

          {/* Divider */}
          <div className="h-px w-full bg-neutral-800" />

          {/* Direct Password Update Form */}
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs text-neutral-400 font-mono">
                  Current Password
                </label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={loadingPassword}
                  className="text-[10px] text-emerald-500 hover:text-emerald-400 transition-colors font-mono"
                >
                  Forgot password?
                </button>
              </div>
              <PasswordField
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
              />
            </div>

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
              disabled={loadingPassword || !oldPassword || !newPassword}
              className="w-full py-2.5 rounded-lg font-mono text-xs font-bold bg-neutral-800 hover:bg-neutral-700 text-white transition-colors disabled:opacity-50 mt-2"
            >
              {loadingPassword ? "Updating..." : "Update Password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
