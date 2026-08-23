"use client";

import { useState } from "react";
import { useZxing } from "react-zxing";
import toast from "react-hot-toast";

interface BarcodeScannerProps {
  onProductFound: (foodData: any) => void;
}

export default function BarcodeScanner({
  onProductFound,
}: BarcodeScannerProps) {
  const [manualCode, setManualCode] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // Upgraded scanner config to force high-res back camera
  const { ref } = useZxing({
    onDecodeResult(result) {
      handleSearch(result.getText());
    },
    constraints: {
      video: {
        facingMode: "environment",
        width: { min: 640, ideal: 1280, max: 1920 },
        height: { min: 480, ideal: 720, max: 1080 },
      },
    },
  });

  const handleSearch = async (barcode: string) => {
    if (!barcode) return;
    setIsSearching(true);
    toast.loading(`Looking up ${barcode}...`, { id: "barcode" });

    try {
      const res = await fetch(
        `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`,
      );
      const data = await res.json();

      if (data.status === 1 && data.product) {
        toast.success("Product found!", { id: "barcode" });
        const p = data.product;
        const n = p.nutriments || {};

        const foodData = {
          name: p.product_name || "Unknown Scanned Product",
          brand: p.brands || "",
          serving_size: 100,
          serving_unit: "g",
          calories: Math.round(n["energy-kcal_100g"] || 0),
          protein_g: Number((n["proteins_100g"] || 0).toFixed(1)),
          carbs_g: Number((n["carbohydrates_100g"] || 0).toFixed(1)),
          fats_g: Number((n["fat_100g"] || 0).toFixed(1)),
          saturated_fats_g: Number((n["saturated-fat_100g"] || 0).toFixed(1)),
          fiber_g: Number((n["fiber_100g"] || 0).toFixed(1)),
          sugar_g: Number((n["sugars_100g"] || 0).toFixed(1)),
          sodium_mg: Math.round((n["sodium_100g"] || 0) * 1000),
        };

        onProductFound(foodData);
      } else {
        toast.error("Product not found in database.", { id: "barcode" });
      }
    } catch (error) {
      toast.error("Failed to fetch product data.", { id: "barcode" });
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in flex flex-col h-full">
      <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden border border-neutral-800 shadow-inner">
        <video
          ref={ref}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 border-2 border-emerald-500/30 rounded-xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-32 border-2 border-emerald-500 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] pointer-events-none" />
        <div className="absolute top-2 left-0 right-0 text-center">
          <span className="bg-black/60 text-white text-[10px] font-mono px-2 py-1 rounded backdrop-blur-sm tracking-wider">
            ALIGN BARCODE
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4 py-2">
        <div className="h-px bg-neutral-800 flex-1" />
        <span className="text-[10px] text-neutral-500 font-mono uppercase">
          or manual entry
        </span>
        <div className="h-px bg-neutral-800 flex-1" />
      </div>

      <div className="flex gap-2">
        <input
          type="number"
          value={manualCode}
          onChange={(e) => setManualCode(e.target.value)}
          placeholder="Enter barcode number..."
          className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-sm font-mono text-white focus:outline-none focus:border-emerald-500 min-w-0"
        />
        <button
          onClick={() => handleSearch(manualCode)}
          disabled={isSearching || !manualCode}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 rounded-lg text-xs font-mono transition disabled:opacity-50 shrink-0"
        >
          {isSearching ? "..." : "Search"}
        </button>
      </div>
    </div>
  );
}
