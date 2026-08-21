import { supabase } from "@/lib/supabase";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProfileUpdate?: (avatarUrl: string) => void;
  onOpenSecurity: () => void;
}

export default function ProfileModal({
  isOpen,
  onClose,
  onProfileUpdate,
  onOpenSecurity,
}: ProfileModalProps) {
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const [email, setEmail] = useState("");
  const [originalEmail, setOriginalEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [weight, setWeight] = useState<number | "">("");
  const [height, setHeight] = useState<number | "">("");
  const [birthDate, setBirthDate] = useState<string>("");
  const [gender, setGender] = useState<"male" | "female">("male");
  const [bodyFat, setBodyFat] = useState<number | "">("");

  const [activityLevel, setActivityLevel] = useState<number>(1.2);
  const [goalType, setGoalType] = useState<string>("maintain");

  const [avatarUrl, setAvatarUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [unitSystem, setUnitSystem] = useState<"metric" | "imperial">("metric");

  // Custom Confirm Dialog State
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    isDestructive: boolean;
    action: () => void;
  } | null>(null);

  // The custom input style applied to all text boxes and dropdowns
  const inputClass =
    "w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-sm text-white focus:border-emerald-500 outline-none transition-colors [color-scheme:dark]";

  useEffect(() => {
    if (isOpen) {
      const fetchProfile = async () => {
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (!session) return;

          if (session.user?.email) {
            setEmail(session.user.email);
            setOriginalEmail(session.user.email);
          }

          const res = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/profile/me`,
            {
              headers: {
                Authorization: `Bearer ${session.access_token}`,
              },
            },
          );

          if (res.ok) {
            const data = await res.json();

            setFirstName(data.first_name || "");
            setLastName(data.last_name || "");
            setWeight(data.weight_kg || "");
            setHeight(data.height_cm || "");
            if (data.body_fat_percentage) setBodyFat(data.body_fat_percentage);

            if (data.birth_date) {
              const dateString = data.birth_date.toString();
              const match = dateString.match(/(\d{4}-\d{2}-\d{2})/);
              if (match) {
                setBirthDate(match[0]);
              } else {
                const d = new Date(dateString);
                if (!isNaN(d.getTime())) {
                  const yyyy = d.getFullYear();
                  const mm = String(d.getMonth() + 1).padStart(2, "0");
                  const dd = String(d.getDate()).padStart(2, "0");
                  setBirthDate(`${yyyy}-${mm}-${dd}`);
                }
              }
            }
            if (data.gender) setGender(data.gender);
            if (data.activity_level) setActivityLevel(data.activity_level);
            if (data.goal_type) setGoalType(data.goal_type);
            if (data.avatar_url) setAvatarUrl(data.avatar_url);

            setUnitSystem("metric");
            setNewPassword("");
          }
        } catch (error) {
          console.error("Failed to load profile", error);
        }
      };

      fetchProfile();
    } else {
      setConfirmConfig(null);
    }
  }, [isOpen]);

  const handleAvatarUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    try {
      if (!event.target.files || event.target.files.length === 0) {
        return;
      }
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        toast.error("You must be logged in to upload an avatar.");
        return;
      }

      const file = event.target.files[0];
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `public/${fileName}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(filePath);
      setAvatarUrl(publicUrl);

      if (onProfileUpdate) {
        onProfileUpdate(publicUrl);
      }

      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/profile/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ avatar_url: publicUrl }),
      });
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast.error("Could not upload image. Please try again.");
    }
  };

  const handleUnitToggle = (newUnit: "metric" | "imperial") => {
    if (newUnit === unitSystem) return;
    if (newUnit === "imperial") {
      setWeight((w) =>
        w === "" ? "" : Number((Number(w) * 2.20462).toFixed(1)),
      );
      setHeight((h) => (h === "" ? "" : Number((Number(h) / 2.54).toFixed(1))));
    } else {
      setWeight((w) =>
        w === "" ? "" : Number((Number(w) / 2.20462).toFixed(1)),
      );
      setHeight((h) => (h === "" ? "" : Number((Number(h) * 2.54).toFixed(1))));
    }
    setUnitSystem(newUnit);
  };

  const calculateAge = (dob: string) => {
    if (!dob) return null;
    const birthDateObj = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDateObj.getFullYear();
    const m = today.getMonth() - birthDateObj.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDateObj.getDate())) {
      age--;
    }
    return age;
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Authentication error. Please log in again.");
        return;
      }

      // Update authentication
      let requireEmailConfirm = false;
      if (email !== originalEmail || newPassword) {
        const authUpdates: { email?: string; password?: string } = {};
        if (email !== originalEmail) authUpdates.email = email;
        if (newPassword) authUpdates.password = newPassword;
        const { error: authError } =
          await supabase.auth.updateUser(authUpdates);
        if (authError) {
          toast.error(authError.message);
          setSaving(false);
          return;
        }
        await supabase.auth.refreshSession();
        if (email !== originalEmail) {
          requireEmailConfirm = true;
        }
      }

      // Update profile metrics
      const finalWeightKg =
        unitSystem === "imperial" && weight !== ""
          ? Number((Number(weight) / 2.20462).toFixed(2))
          : Number(weight);
      const finalHeightCm =
        unitSystem === "imperial" && height !== ""
          ? Number((Number(height) * 2.54).toFixed(2))
          : Number(height);

      const payload = {
        first_name: firstName,
        last_name: lastName,
        weight_kg: finalWeightKg,
        height_cm: finalHeightCm,
        birth_date: birthDate || null,
        age: birthDate ? calculateAge(birthDate) : null,
        gender: gender,
        activity_level: activityLevel,
        goal_type: goalType,
        avatar_url: avatarUrl,
        body_fat_percentage: bodyFat === "" ? null : Number(bodyFat),
      };

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/profile/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        if (requireEmailConfirm) {
          toast.success(
            "Check your new email address for a confirmation link!",
          );
        } else if (newPassword) {
          toast.success("Profile and password updated successfully!");
        } else {
          toast.success("Profile saved successfully!");
        }
        onClose();
        router.refresh();
      } else {
        throw new Error("Server returned an error");
      }
    } catch (error) {
      console.error("Failed to save profile:", error);
      toast.error("Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Handle Account Deletion
  const handleDeleteAccountClick = () => {
    setConfirmConfig({
      isOpen: true,
      title: "DELETE ACCOUNT",
      message:
        "Are you absolutely sure you want to permanently delete your account and all associated data? This action cannot be undone.",
      confirmText: "Delete My Account",
      isDestructive: true,
      action: async () => {
        setConfirmConfig(null);
        setSaving(true);
        toast.loading("Deleting account...", { id: "deleteAccount" });
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (session) {
            const res = await fetch(
              `${process.env.NEXT_PUBLIC_API_URL}/profile/me`,
              {
                method: "DELETE",
                headers: { Authorization: `Bearer ${session.access_token}` },
              },
            );

            if (!res.ok) {
              const errText = await res.text();
              toast.error(`Backend Error: ${errText || "Route missing"}`, {
                id: "deleteAccount",
              });
              setSaving(false);
              return;
            }

            await supabase.auth.signOut();
            toast.success("Account deleted successfully.", {
              id: "deleteAccount",
            });
            onClose();
            router.replace("/login");
          }
        } catch (err) {
          console.error(err);
          toast.error("Network failed. Is the backend running?", {
            id: "deleteAccount",
          });
          setSaving(false);
        }
      },
    });
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg max-w-2xl w-full p-6 text-white font-sans relative my-8 shadow-2xl">
          {/* Header & Close Button */}
          <div className="flex justify-between items-center border-b border-neutral-800 pb-4 mb-6">
            <h2 className="text-lg font-bold font-mono tracking-wider">
              PROFILE SETTINGS
            </h2>
            <div className="flex items-center gap-5">
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  router.replace("/login");
                }}
                className="text-xs font-mono text-neutral-400 hover:text-white transition-colors flex items-center gap-1.5"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                SIGN OUT
              </button>
              <button
                onClick={onClose}
                className="text-neutral-400 hover:text-white font-mono text-sm ml-2"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Scrollable Content Area */}
          <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
            {/* Personal Details Section */}
            <div className="space-y-3">
              <h3 className="text-xs font-mono text-neutral-400 uppercase tracking-wider">
                Personal Details
              </h3>

              {/* Avatar Upload */}
              <div className="flex items-center gap-4 py-2">
                <div className="w-14 h-14 bg-neutral-950 border border-neutral-800 rounded-full flex items-center justify-center text-neutral-400 text-sm shrink-0 overflow-hidden relative group cursor-pointer">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Profile"
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <span className="text-neutral-400 font-mono text-xs">
                      IMG
                    </span>
                  )}
                  <div className="absolute inset-0 bg-black/60 hidden group-hover:flex items-center justify-center transition-all">
                    <span className="text-white font-mono text-[10px] tracking-wider font-semibold">
                      UPLOAD
                    </span>
                  </div>
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/webp"
                    onChange={handleAvatarUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>
                <div>
                  <p className="text-sm font-mono text-neutral-300 mb-0.5">
                    Profile Photo
                  </p>
                  <p className="text-xs font-mono text-neutral-500">
                    Click avatar to update
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-mono text-neutral-400 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-neutral-400 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            {/* Physical Metrics Section */}
            <div className="space-y-3 pt-2 border-t border-neutral-800">
              <h3 className="text-xs font-mono text-neutral-400 uppercase tracking-wider">
                Physical Metrics
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-mono text-neutral-400 mb-1">
                    Weight ({unitSystem === "metric" ? "kg" : "lbs"})
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={weight}
                    onChange={(e) =>
                      setWeight(
                        e.target.value === "" ? "" : Number(e.target.value),
                      )
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-neutral-400 mb-1">
                    Height ({unitSystem === "metric" ? "cm" : "in"})
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={height}
                    onChange={(e) =>
                      setHeight(
                        e.target.value === "" ? "" : Number(e.target.value),
                      )
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-neutral-400 mb-1 flex justify-between">
                    <span>Body Fat %</span>
                    <span className="text-neutral-500">Optional</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={bodyFat}
                    onChange={(e) =>
                      setBodyFat(
                        e.target.value === "" ? "" : Number(e.target.value),
                      )
                    }
                    placeholder="e.g. 15"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-neutral-400 mb-1">
                    Sex
                  </label>
                  <select
                    value={gender}
                    onChange={(e) =>
                      setGender(e.target.value as "male" | "female")
                    }
                    className={inputClass}
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono text-neutral-400 mb-1 flex justify-between">
                    <span>Birth Date</span>
                    {birthDate && (
                      <span className="text-neutral-500">
                        Age: {calculateAge(birthDate)}
                      </span>
                    )}
                  </label>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Preferred Units Toggle */}
              <div className="pt-2">
                <label className="block text-xs font-mono text-neutral-400 mb-1">
                  Measurement System
                </label>
                <select
                  value={unitSystem}
                  onChange={(e) =>
                    handleUnitToggle(e.target.value as "metric" | "imperial")
                  }
                  className={inputClass}
                >
                  <option value="metric">Metric (kg, cm)</option>
                  <option value="imperial">Imperial (lbs, in)</option>
                </select>
              </div>
            </div>

            {/* Goals & Activity Section */}
            <div className="space-y-3 pt-2 border-t border-neutral-800 pb-2">
              <h3 className="text-xs font-mono text-neutral-400 uppercase tracking-wider">
                Goals & Activity
              </h3>
              <div>
                <label className="block text-xs font-mono text-neutral-400 mb-1">
                  Activity Level
                </label>
                <select
                  value={activityLevel}
                  onChange={(e) => setActivityLevel(Number(e.target.value))}
                  className={inputClass}
                >
                  <option value={1.2}>Sedentary (Little to no exercise)</option>
                  <option value={1.375}>Lightly Active (1-3 days/week)</option>
                  <option value={1.55}>
                    Moderately Active (3-5 days/week)
                  </option>
                  <option value={1.725}>Very Active (6-7 days/week)</option>
                </select>

                {/* Safety Measure for Muscle Gain + Sedentary */}
                {activityLevel === 1.2 && goalType === "bulk" && (
                  <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/50 rounded-lg flex items-start gap-2 text-amber-400 text-xs font-mono animate-in fade-in">
                    <svg
                      className="w-4 h-4 shrink-0 mt-0.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <p>
                      <strong>Tip:</strong> Your current goal is{" "}
                      <strong>Muscle Gain</strong>. A sedentary activity level
                      may lead to excess fat gain instead of muscle.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2 pb-4">
              <button
                type="button"
                onClick={onOpenSecurity}
                className="w-full py-3 rounded-lg border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 font-mono text-xs transition-colors flex items-center justify-center gap-2"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
                Manage Account Security (Email & Password)
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-between gap-3 pt-6 border-t border-neutral-800 mt-2">
            <button
              onClick={handleDeleteAccountClick}
              disabled={saving}
              className="px-4 py-2 rounded font-mono text-xs text-rose-500 hover:bg-rose-500/10 transition text-center sm:text-left disabled:opacity-50"
            >
              Delete Account
            </button>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded font-mono text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition text-center"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSave()}
                disabled={saving}
                className="px-4 py-2 rounded font-mono text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition disabled:opacity-50 text-center"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Custom confirmation modal for deletion */}
      {confirmConfig?.isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl max-w-xs w-full p-6 text-white shadow-2xl animate-in fade-in zoom-in-95">
            <h3
              className={`text-lg font-bold font-mono tracking-wider mb-2 ${confirmConfig.isDestructive ? "text-rose-500" : "text-emerald-400"}`}
            >
              {confirmConfig.title}
            </h3>
            <p className="text-sm text-neutral-400 mb-6 font-mono leading-relaxed">
              {confirmConfig.message}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmConfig(null)}
                className="px-4 py-2 rounded font-mono text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmConfig.action}
                className={`px-4 py-2 rounded font-mono text-xs font-bold transition ${
                  confirmConfig.isDestructive
                    ? "bg-rose-600 hover:bg-rose-500 text-white"
                    : "bg-emerald-600 hover:bg-emerald-500 text-white"
                }`}
              >
                {confirmConfig.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
