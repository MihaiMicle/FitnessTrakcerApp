import React from "react";

interface DetailedNutritionModalProps {
  isOpen: boolean;
  onClose: () => void;
  dailyLog: any;
}

export default function DetailedNutritionModal({
  isOpen,
  onClose,
  dailyLog,
}: DetailedNutritionModalProps) {
  if (!isOpen) return null;

  // EXTRACT TOTALS: Using ?? ensures that 0 is respected and not overwritten by a fallback
  const details = {
    calories: dailyLog?.total_calories ?? 0,
    protein: dailyLog?.total_protein_g ?? 0,
    carbs: dailyLog?.total_carbs_g ?? 0,
    fats: dailyLog?.total_fats_g ?? 0,
    satFat: dailyLog?.total_saturated_fats_g ?? 0,
    fiber: dailyLog?.total_fiber_g ?? 0,
    sugar: dailyLog?.total_sugar_g ?? 0,
    potassium: dailyLog?.total_potassium_mg ?? 0,
    sodium: dailyLog?.total_sodium_mg ?? 0,
    iron: dailyLog?.total_iron_mg ?? 0,
    zinc: dailyLog?.total_zinc_mg ?? 0,
    magnesium: dailyLog?.total_magnesium_mg ?? 0,
    calcium: dailyLog?.total_calcium_mg ?? 0,
    vitaminD: dailyLog?.total_vitamin_d_mcg ?? 0,
    cholesterol: dailyLog?.total_cholesterol_mg ?? 0,
  };

  // EXTRACT TARGETS: Safe to use || here to inject the optimal baselines if missing
  const targets = {
    calories: dailyLog?.target_calories || 2500,
    protein: dailyLog?.target_protein_g || 180,
    carbs: dailyLog?.target_carbs_g || 300,
    fats: dailyLog?.target_fats_g || 70,
    satFat: dailyLog?.target_saturated_fats_g || 20,
    fiber: dailyLog?.target_fiber_g || 30,
    sugar: dailyLog?.target_sugar_g || 50,
    potassium: dailyLog?.target_potassium_mg || 4000,
    sodium: dailyLog?.target_sodium_mg || 2300,
    iron: dailyLog?.target_iron_mg || 8,
    zinc: dailyLog?.target_zinc_mg || 11,
    magnesium: dailyLog?.target_magnesium_mg || 400,
    calcium: dailyLog?.target_calcium_mg || 1200,
    vitaminD: dailyLog?.target_vitamin_d_mcg || 25,
    cholesterol: dailyLog?.target_cholesterol_mg || 300,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      {/* 
        MODAL CONTAINER: 
        Restored to max-w-md (original size), kept flex-col and max-h-[85vh] to enable scrolling.
      */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg max-w-md w-full p-6 text-white font-sans relative shadow-2xl flex flex-col max-h-[85vh]">
        
        {/* HEADER: shrink-0 keeps it pinned to the top */}
        <div className="flex justify-between items-center border-b border-neutral-800 pb-4 mb-4 shrink-0">
          <h2 className="text-lg font-bold font-mono tracking-wider">
            NUTRITION DETAILS
          </h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-white font-mono text-sm">✕</button>
        </div>

        {/* 
          SCROLLABLE CONTENT: 
          flex-1 allows it to fill space, overflow-y-auto guarantees the scrollbar 
        */}
        <div className="overflow-y-auto pr-2 custom-scrollbar flex-1 space-y-4">
          
          <div>
            <h3 className="text-xs font-mono text-neutral-400 uppercase tracking-wider mb-3">
              Primary Macros
            </h3>
            <div className="grid grid-cols-1 gap-3">
              <div className="bg-neutral-950 border border-neutral-800 rounded p-3 flex justify-between items-center">
                <span className="text-sm font-mono text-neutral-300">Calories</span>
                <div className="text-sm font-mono">
                  <span className="font-bold text-emerald-500">{details.calories} kcal</span>
                  <span className="text-neutral-500"> / {targets.calories} kcal</span>
                </div>
              </div>
              
              <div className="bg-neutral-950 border border-neutral-800 rounded p-3 flex justify-between items-center">
                <span className="text-sm font-mono text-neutral-300">Protein</span>
                <div className="text-sm font-mono">
                  <span className="font-bold text-blue-500">{details.protein}g</span>
                  <span className="text-neutral-500"> / {targets.protein}g</span>
                </div>
              </div>

              <div className="bg-neutral-950 border border-neutral-800 rounded p-3 flex justify-between items-center">
                <span className="text-sm font-mono text-neutral-300">Carbs</span>
                <div className="text-sm font-mono">
                  <span className="font-bold text-amber-500">{details.carbs}g</span>
                  <span className="text-neutral-500"> / {targets.carbs}g</span>
                </div>
              </div>

              <div className="bg-neutral-950 border border-neutral-800 rounded p-3 flex justify-between items-center">
                <span className="text-sm font-mono text-neutral-300">Fats</span>
                <div className="text-sm font-mono">
                  <span className="font-bold text-rose-500">{details.fats}g</span>
                  <span className="text-neutral-500"> / {targets.fats}g</span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-neutral-800/60 my-2" />

          <div>
            <h3 className="text-xs font-mono text-neutral-400 uppercase tracking-wider mb-3">
              Micronutrients
            </h3>
            <div className="grid grid-cols-1 gap-3">
              <div className="bg-neutral-950 border border-neutral-800 rounded p-3 flex justify-between items-center">
                <span className="text-sm font-mono text-neutral-300">Saturated Fat</span>
                <div className="text-sm font-mono">
                  <span className="font-bold text-red-500">{details.satFat}g</span>
                  <span className="text-neutral-500"> / {targets.satFat}g</span>
                </div>
              </div>
              
              <div className="bg-neutral-950 border border-neutral-800 rounded p-3 flex justify-between items-center">
                <span className="text-sm font-mono text-neutral-300">Fiber</span>
                <div className="text-sm font-mono">
                  <span className="font-bold text-emerald-500">{details.fiber}g</span>
                  <span className="text-neutral-500"> / {targets.fiber}g</span>
                </div>
              </div>

              <div className="bg-neutral-950 border border-neutral-800 rounded p-3 flex justify-between items-center">
                <span className="text-sm font-mono text-neutral-300">Sugar</span>
                <div className="text-sm font-mono">
                  <span className="font-bold text-purple-500">{details.sugar}g</span>
                  <span className="text-neutral-500"> / {targets.sugar}g</span>
                </div>
              </div>

              <div className="bg-neutral-950 border border-neutral-800 rounded p-3 flex justify-between items-center">
                <span className="text-sm font-mono text-neutral-300">Potassium</span>
                <div className="text-sm font-mono">
                  <span className="font-bold text-blue-500">{details.potassium}mg</span>
                  <span className="text-neutral-500"> / {targets.potassium}mg</span>
                </div>
              </div>

              <div className="bg-neutral-950 border border-neutral-800 rounded p-3 flex justify-between items-center">
                <span className="text-sm font-mono text-neutral-300">Sodium</span>
                <div className="text-sm font-mono">
                  <span className="font-bold text-orange-500">{details.sodium}mg</span>
                  <span className="text-neutral-500"> / {targets.sodium}mg</span>
                </div>
              </div>

              <div className="bg-neutral-950 border border-neutral-800 rounded p-3 flex justify-between items-center">
                <span className="text-sm font-mono text-neutral-300">Iron</span>
                <div className="text-sm font-mono">
                  <span className="font-bold text-rose-500">{details.iron}mg</span>
                  <span className="text-neutral-500"> / {targets.iron}mg</span>
                </div>
              </div>

              <div className="bg-neutral-950 border border-neutral-800 rounded p-3 flex justify-between items-center">
                <span className="text-sm font-mono text-neutral-300">Zinc</span>
                <div className="text-sm font-mono">
                  <span className="font-bold text-yellow-400">{details.zinc}mg</span>
                  <span className="text-neutral-500"> / {targets.zinc}mg</span>
                </div>
              </div>

              <div className="bg-neutral-950 border border-neutral-800 rounded p-3 flex justify-between items-center">
                <span className="text-sm font-mono text-neutral-300">Magnesium</span>
                <div className="text-sm font-mono">
                  <span className="font-bold text-emerald-400">{details.magnesium}mg</span>
                  <span className="text-neutral-500"> / {targets.magnesium}mg</span>
                </div>
              </div>

              <div className="bg-neutral-950 border border-neutral-800 rounded p-3 flex justify-between items-center">
                <span className="text-sm font-mono text-neutral-300">Calcium</span>
                <div className="text-sm font-mono">
                  <span className="font-bold text-cyan-400">{details.calcium}mg</span>
                  <span className="text-neutral-500"> / {targets.calcium}mg</span>
                </div>
              </div>

              <div className="bg-neutral-950 border border-neutral-800 rounded p-3 flex justify-between items-center">
                <span className="text-sm font-mono text-neutral-300">Vitamin D</span>
                <div className="text-sm font-mono">
                  <span className="font-bold text-indigo-400">{details.vitaminD}mcg</span>
                  <span className="text-neutral-500"> / {targets.vitaminD}mcg</span>
                </div>
              </div>

              <div className="bg-neutral-950 border border-neutral-800 rounded p-3 flex justify-between items-center">
                <span className="text-sm font-mono text-neutral-300">Cholesterol</span>
                <div className="text-sm font-mono">
                  <span className="font-bold text-neutral-200">{details.cholesterol}mg</span>
                  <span className="text-neutral-500"> / {targets.cholesterol}mg</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER ACTION BUTTON: shrink-0 keeps it pinned to the bottom */}
        <div className="mt-4 pt-4 border-t border-neutral-800 shrink-0">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 rounded font-mono text-xs bg-white hover:bg-neutral-200 text-black font-bold transition shadow-[0_0_15px_rgba(255,255,255,0.1)]"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
}