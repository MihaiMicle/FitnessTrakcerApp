import { supabase } from "@/lib/supabase";
import { useState, useEffect, useRef } from "react";
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

  // Webcam State
  const [showWebcam, setShowWebcam] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const videoRef = useRef<HTMLVideoElement>(null);

  const inputClass =
    "w-full py-2 px-3 rounded-lg font-mono text-xs font-bold bg-neutral-800 hover:bg-neutral-700 text-white transition-colors disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-emerald-500 [color-scheme:dark]";

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
      stopWebcam();
    }
  }, [isOpen]);

  // Clean up webcam stream on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  // Attach stream to video element when it opens
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, showWebcam]);

  const startWebcam = async (mode: "user" | "environment" = "user") => {
    setFacingMode(mode);

    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode },
      });
      setStream(mediaStream);
      setShowWebcam(true);
    } catch (err) {
      console.error("Webcam error:", err);
      toast.error("Could not access camera. Please check your permissions.");
    }
  };

  const flipCamera = () => {
    const newMode = facingMode === "user" ? "environment" : "user";
    startWebcam(newMode);
  };

  const stopWebcam = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    setStream(null);
    setShowWebcam(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");

      if (ctx) {
        // If front camera, flip the canvas image horizontally so it saves correctly
        if (facingMode === "user") {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }

        ctx.drawImage(videoRef.current, 0, 0);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const file = new File(
                [blob],
                `camera-capture-${Date.now()}.jpg`,
                { type: "image/jpeg" },
              );
              uploadFile(file);
              stopWebcam();
            }
          },
          "image/jpeg",
          0.9,
        );
      }
    }
  };

  // Reusable core upload logic
  const uploadFile = async (file: File) => {
    toast.loading("Uploading photo...", { id: "upload" });
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        toast.error("You must be logged in to upload an avatar.", {
          id: "upload",
        });
        return;
      }

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

      toast.success("Photo updated successfully!", { id: "upload" });
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast.error("Could not upload image. Please try again.", {
        id: "upload",
      });
    }
  };

  const handleFilePicker = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      uploadFile(event.target.files[0]);
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
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg max-w-3xl w-full p-6 text-white font-sans relative my-8 shadow-2xl">
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
                    onChange={handleFilePicker}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>
                <div>
                  <p className="text-sm font-mono text-neutral-300 mb-1.5">
                    Profile Photo
                  </p>
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] sm:text-xs font-mono font-medium bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white px-2.5 py-1.5 rounded transition-colors cursor-pointer border border-transparent">
                      Upload Photo
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/webp"
                        onChange={handleFilePicker}
                        className="hidden"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => startWebcam("user")}
                      className="text-[10px] sm:text-xs font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white px-2.5 py-1.5 rounded transition-colors cursor-pointer active:scale-95 flex items-center gap-1.5"
                    >
                      <svg
                        className="w-3 h-3 sm:w-3.5 sm:h-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      Take Photo
                    </button>
                  </div>
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

      {/* Webcam Overlay Modal */}
      {showWebcam && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
          <div className="bg-neutral-900 border border-emerald-500/50 rounded-xl max-w-sm w-full p-6 text-white shadow-2xl animate-in zoom-in-95 flex flex-col items-center">
            <h3 className="text-lg font-bold font-mono tracking-wider mb-4 w-full text-center text-emerald-400">
              CAPTURE PHOTO
            </h3>

            <div className="relative w-full aspect-square bg-black rounded-lg overflow-hidden border border-neutral-800 mb-6 shadow-inner group">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${facingMode === "user" ? "scale-x-[-1]" : ""}`}
              />
              <div className="absolute inset-0 border-2 border-emerald-500/30 rounded-lg pointer-events-none" />

              {/* Flip Camera Button */}
              <button
                onClick={flipCamera}
                className="absolute top-3 right-3 bg-black/50 hover:bg-black/80 text-white p-2.5 rounded-full backdrop-blur-sm transition-all border border-neutral-700 active:scale-95"
                title="Switch Camera"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </button>
            </div>

            <div className="flex w-full gap-3">
              <button
                onClick={stopWebcam}
                className="flex-1 py-3 rounded-lg font-mono text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={capturePhoto}
                className="flex-1 py-3 rounded-lg font-mono text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors flex items-center justify-center gap-2"
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
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                Capture
              </button>
            </div>
          </div>
        </div>
      )}

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
