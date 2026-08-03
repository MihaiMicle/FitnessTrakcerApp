import { supabase } from "@/lib/supabase";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [weightKg, setWeightKg] = useState<number | "">("");
  const [heightCm, setHeightCm] = useState<number | "">("");
  const [birthDate, setBirthDate] = useState<Date | "">("");
  const [gender, setGender] = useState<"male" | "female">("male");
  const [activityLevel, setActivityLevel] = useState<number>(1.2);
  const [avatarUrl, setAvatarUrl] = useState("");

  useEffect(() => {
    if (isOpen) {
      const fetchProfile = async () => {
        try {
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/profile/me`,
          );
          if (res.ok) {
            const data = await res.json();
            setFirstName(data.first_name || "");
            setLastName(data.last_name || "");
            setWeightKg(data.weight_kg || "");
            setHeightCm(data.height_cm || "");
            setBirthDate(data.birth_date || "");
            if (data.gender) setGender(data.gender);
            if (data.activity_level) setActivityLevel(data.activity_level);
          }
        } catch (error) {
          console.error("Failed to load profile", error);
        }
      };
      fetchProfile();
    }
  }, [isOpen]);

  const handleAvatarUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    try {
      if (!event.target.files || event.target.files.length === 0) {
        return;
      }

      const file = event.target.files[0];
      const fileExt = file.name.split(".").pop();

      // Create a unique file name to prevent overwriting
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `public/${fileName}`;

      // Upload the image to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("avatars") // Bucket name
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // Get the public URL of the uploaded image
      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(filePath);

      // Update the local React state so the image renders immediately in the UI
      setAvatarUrl(publicUrl);

      // Send the new URL to your FastAPI backend so it persists
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/profile/me`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar_url: publicUrl }),
      });
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast.error("Could not upload image. Please try again.");
    }
  };

  // Single Save Function for everything
  const handleSave = async (autoCalculate: boolean) => {
    try {
      const payload = {
        first_name: firstName,
        last_name: lastName,
        weight_kg: Number(weightKg),
        height_cm: Number(heightCm),
        birth_date: birthDate,
        gender: gender,
        activity_level: activityLevel,
        auto_calculate: autoCalculate,
        avatar_url: avatarUrl,
      };

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/profile/me`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success("Profile saved successfully!");
        onClose();
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to save profile:", error);
      toast.error("Failed to save profile. Please try again.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Modal Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h1 className="text-xl font-bold text-gray-800">Profile Settings</h1>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 transition-colors"
          >
            <svg
              width="24"
              height="24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div className="p-6 overflow-y-auto space-y-8">
          {/* Personal Details */}
          <section className="space-y-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider border-b pb-2">
              Personal Details
            </h2>

            {/* Profile Photo */}
            <div className="flex items-center gap-4 py-2">
              <div className="h-16 w-16 rounded-full bg-gray-200 border border-gray-300 flex items-center justify-center overflow-hidden relative group cursor-pointer">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Profile"
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <span className="text-gray-500 text-sm font-medium">Img</span>
                )}
                <div className="absolute inset-0 bg-black/40 hidden group-hover:flex items-center justify-center transition-all">
                  <span className="text-white text-xs font-semibold">
                    Upload
                  </span>
                </div>
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handleAvatarUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
              <div className="text-sm text-gray-600">
                <p className="font-medium text-gray-800">Profile Photo</p>
                <p>Click to upload a new avatar</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col">
                <label className="text-sm text-gray-600 mb-1">First Name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="border border-gray-300 p-2 rounded-md focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-sm text-gray-600 mb-1">Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="border border-gray-300 p-2 rounded-md focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
            </div>

            <div className="flex flex-col">
              <label className="text-sm text-gray-600 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border border-gray-300 p-2 rounded-md focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </section>

          {/* Physical Metrics */}
          <section className="space-y-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider border-b pb-2">
              Physical Metrics
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col">
                <label className="text-sm text-gray-600 mb-1">
                  Weight (kg)
                </label>
                <input
                  type="number"
                  value={weightKg}
                  onChange={(e) => setWeightKg(Number(e.target.value))}
                  placeholder="0"
                  className="border border-gray-300 p-2 rounded-md focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-sm text-gray-600 mb-1">
                  Height (cm)
                </label>
                <input
                  type="number"
                  value={heightCm}
                  onChange={(e) => setHeightCm(Number(e.target.value))}
                  placeholder="0"
                  className="border border-gray-300 p-2 rounded-md focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-sm text-gray-600 mb-1">Age</label>
                <input
                  type="number"
                  value={
                    birthDate
                      ? new Date().getFullYear() - birthDate.getFullYear()
                      : ""
                  }
                  onChange={(e) => setBirthDate(new Date(e.target.value))}
                  placeholder="0"
                  className="border border-gray-300 p-2 rounded-md focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-sm text-gray-600 mb-1">Sex</label>
                <select
                  value={gender}
                  onChange={(e) =>
                    setGender(e.target.value as "male" | "female")
                  }
                  className="border border-gray-300 p-2 rounded-md bg-white focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
            </div>

            {/* Static Units Display */}
            <div className="flex justify-between items-center bg-gray-50 p-3 rounded-md border border-gray-200 mt-2">
              <span className="text-sm text-gray-600 font-medium">
                Preferred Units
              </span>
              <span className="text-sm text-gray-500">kg, cm, cal, km, ml</span>
            </div>
          </section>

          {/* Goals & Activity */}
          <section className="space-y-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider border-b pb-2">
              Goals & Activity
            </h2>

            <div className="flex flex-col">
              <label className="text-sm text-gray-600 mb-1">
                Activity Level
              </label>
              <select
                value={activityLevel}
                onChange={(e) => setActivityLevel(Number(e.target.value))}
                className="border border-gray-300 p-2 rounded-md bg-white focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value={1.2}>Sedentary (Little to no exercise)</option>
                <option value={1.375}>Lightly Active (1-3 days/week)</option>
                <option value={1.55}>Moderately Active (3-5 days/week)</option>
                <option value={1.725}>Very Active (6-7 days/week)</option>
              </select>
            </div>
          </section>
        </div>

        {/* Modal Footer */}
        <div className="border-t border-gray-200 p-4 bg-gray-50 flex justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => handleSave(false)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium shadow-sm"
          >
            Save Changes
          </button>
          <button
            onClick={() => handleSave(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium shadow-sm"
          >
            Auto-Calculate Goals
          </button>
        </div>
      </div>
    </div>
  );
}
