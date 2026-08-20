"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";

interface OnboardingWizardProps {
  onComplete: () => void;
}

export default function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    gender: "male",
    age: 21 as number | "",
    height_cm: 170 as number | "",
    weight_kg: 70 as number | "",
    activity_level: 1.375,
    goal_type: "maintain"
  });

  const handleNext = () => setStep((s) => Math.min(s + 1, 4));
  const handleBack = () => setStep((s) => Math.max(s - 1, 1));

  const handleFinish = async () => {
    setIsSubmitting(true);
    toast.loading("Personalizing your targets...", { id: "onboarding" });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");

      // Auto-calculate macros based on the gathered data
      const w = Number(formData.weight_kg) || 70;
      const h = Number(formData.height_cm) || 170;
      const a = Number(formData.age) || 21;
      const isMale = formData.gender === "male";
      const activity = Number(formData.activity_level);

      const bmr = (10 * w) + (6.25 * h) - (5 * a) + (isMale ? 5 : -161);
      const tdee = bmr * activity;

      let cals = tdee;
      if (formData.goal_type === "cut") cals -= 500;
      if (formData.goal_type === "bulk") cals += 300;
      cals = Math.round(cals);

      const p = Math.round(w * 2.2);
      const f = Math.round(w * 0.8);
      const c = Math.round((cals - (p * 4) - (f * 9)) / 4);

      const fullPayload = {
        ...formData,
        target_calories: cals,
        target_protein_g: p,
        target_carbs_g: c,
        target_fats_g: f,
        target_water_ml: 3000
      };

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/profile/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(fullPayload),
      });

      if (!res.ok) throw new Error("Failed to save profile");

      toast.success("Welcome aboard!", { id: "onboarding" });
      onComplete();
    } catch (error) {
      toast.error("Failed to setup profile. Please try again.", { id: "onboarding" });
      setIsSubmitting(false);
    }
  };

  const inputClass = "w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 font-mono text-white focus:border-emerald-500 outline-none transition-colors";

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95">
        
        {/* Progress Indicator */}
        <div className="flex gap-2 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${step >= i ? "bg-emerald-500" : "bg-neutral-800"}`} />
          ))}
        </div>

        {/* Step 1: Basics */}
        {step === 1 && (
          <div className="space-y-5 animate-in slide-in-from-right-4">
            <h2 className="text-2xl font-bold text-white tracking-tight">Let's get the basics.</h2>
            <div>
              <label className="text-sm font-mono text-neutral-400 block mb-2">Biological Sex</label>
              <div className="flex gap-3">
                <button onClick={() => setFormData({ ...formData, gender: "male" })} className={`flex-1 py-3 rounded-lg font-bold border transition-colors ${formData.gender === "male" ? "bg-emerald-600 border-emerald-500 text-white" : "bg-neutral-950 border-neutral-800 text-neutral-400"}`}>Male</button>
                <button onClick={() => setFormData({ ...formData, gender: "female" })} className={`flex-1 py-3 rounded-lg font-bold border transition-colors ${formData.gender === "female" ? "bg-emerald-600 border-emerald-500 text-white" : "bg-neutral-950 border-neutral-800 text-neutral-400"}`}>Female</button>
              </div>
            </div>
            <div>
              <label className="text-sm font-mono text-neutral-400 block mb-2">Age</label>
              <input 
                type="number" 
                value={formData.age} 
                onChange={(e) => setFormData({ ...formData, age: e.target.value === "" ? "" : Number(e.target.value) })} 
                className={inputClass} 
              />
            </div>
          </div>
        )}

        {/* Step 2: Metrics */}
        {step === 2 && (
          <div className="space-y-5 animate-in slide-in-from-right-4">
            <h2 className="text-2xl font-bold text-white tracking-tight">Your current metrics.</h2>
            <div>
              <label className="text-sm font-mono text-neutral-400 block mb-2">Height (cm)</label>
              <input 
                type="number" 
                value={formData.height_cm} 
                onChange={(e) => setFormData({ ...formData, height_cm: e.target.value === "" ? "" : Number(e.target.value) })} 
                className={inputClass} 
              />
            </div>
            <div>
              <label className="text-sm font-mono text-neutral-400 block mb-2">Weight (kg)</label>
              <input 
                type="number" 
                step="0.1" 
                value={formData.weight_kg} 
                onChange={(e) => setFormData({ ...formData, weight_kg: e.target.value === "" ? "" : Number(e.target.value) })} 
                className={inputClass} 
              />
            </div>
          </div>
        )}

        {/* Step 3: Lifestyle */}
        {step === 3 && (
          <div className="space-y-5 animate-in slide-in-from-right-4">
            <h2 className="text-2xl font-bold text-white tracking-tight">How active are you?</h2>
            <div className="space-y-2">
              {[
                { val: 1.2, label: "Sedentary", desc: "Little to no exercise" },
                { val: 1.375, label: "Lightly Active", desc: "Training 1-3 days/week" },
                { val: 1.55, label: "Moderately Active", desc: "Training 3-5 days/week" },
                { val: 1.725, label: "Very Active", desc: "Training 6-7 days/week" }
              ].map((act) => (
                <div key={act.val} onClick={() => setFormData({ ...formData, activity_level: act.val })} className={`p-4 rounded-xl border cursor-pointer transition-colors ${formData.activity_level === act.val ? "bg-emerald-900/30 border-emerald-500" : "bg-neutral-950 border-neutral-800 hover:border-neutral-700"}`}>
                  <h4 className={`font-bold ${formData.activity_level === act.val ? "text-emerald-400" : "text-neutral-200"}`}>{act.label}</h4>
                  <p className="text-xs font-mono text-neutral-500 mt-1">{act.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Goals */}
        {step === 4 && (
          <div className="space-y-5 animate-in slide-in-from-right-4">
            <h2 className="text-2xl font-bold text-white tracking-tight">What is your primary goal?</h2>
            <div className="space-y-2">
              {[
                { val: "cut", label: "Fat Loss (Cut)", desc: "Maintain muscle, drop body fat" },
                { val: "maintain", label: "Maintenance", desc: "Body recomposition & strength" },
                { val: "bulk", label: "Build Muscle (Bulk)", desc: "Maximize lean hypertrophy" }
              ].map((g) => (
                <div key={g.val} onClick={() => setFormData({ ...formData, goal_type: g.val })} className={`p-4 rounded-xl border cursor-pointer transition-colors ${formData.goal_type === g.val ? "bg-emerald-900/30 border-emerald-500" : "bg-neutral-950 border-neutral-800 hover:border-neutral-700"}`}>
                  {/* Fixed typo: changed act.label to g.label */}
                  <h4 className={`font-bold ${formData.goal_type === g.val ? "text-emerald-400" : "text-neutral-200"}`}>{g.label}</h4>
                  <p className="text-xs font-mono text-neutral-500 mt-1">{g.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer Navigation */}
        <div className="flex justify-between mt-8 pt-4 border-t border-neutral-800">
          <button onClick={handleBack} disabled={step === 1 || isSubmitting} className="px-4 py-2 font-mono text-sm text-neutral-400 hover:text-white disabled:opacity-0 transition-colors">
            Back
          </button>
          
          {step < 4 ? (
            <button 
              onClick={handleNext} 
              // Prevent moving forward if they left height/weight/age completely blank
              disabled={(step === 1 && formData.age === "") || (step === 2 && (formData.height_cm === "" || formData.weight_kg === ""))}
              className="px-6 py-2 rounded-lg bg-white text-black font-bold font-mono hover:bg-neutral-200 transition-colors disabled:opacity-50"
            >
              Next
            </button>
          ) : (
            <button onClick={handleFinish} disabled={isSubmitting} className="px-6 py-2 rounded-lg bg-emerald-600 text-white font-bold font-mono hover:bg-emerald-500 transition-colors disabled:opacity-50">
              {isSubmitting ? "Building Profile..." : "Finish Setup"}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}