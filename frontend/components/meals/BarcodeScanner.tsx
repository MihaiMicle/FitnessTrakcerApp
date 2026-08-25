'use client';

import { useRef, useState } from 'react';
import { useZxing } from 'react-zxing';
import toast from 'react-hot-toast';

interface BarcodeScannerProps {
  onProductFound: (foodData: any) => void;
}

// Retail 1D formats only
const BARCODE_FORMATS = [
  'ean_13',
  'ean_8',
  'upc_a',
  'upc_e',
  'code_128',
  'code_39',
  'itf',
] as const;

export default function BarcodeScanner({
  onProductFound,
}: BarcodeScannerProps) {
  const [manualCode, setManualCode] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);

  const lastScannedRef = useRef<string | null>(null);

  const { ref, torch } = useZxing({
    paused,
    formats: [...BARCODE_FORMATS] as any,
    trySkew: true, // retrie rotated frames
    timeBetweenDecodingAttempts: 250,
    constraints: {
      audio: false,
      video: {
        facingMode: 'environment',
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    },
    onDecodeResult(result) {
      const code = result.rawValue;
      if (!code || code === lastScannedRef.current) return;
      lastScannedRef.current = code;
      setPaused(true);
      handleSearch(code);
    },
    onDecodeError(error) {
      console.debug('[scanner] decode error', error);
    },
    onError(error) {
      // Camera/permission/WASM failures
      console.error('[scanner] camera error', error);
      setCameraError(
        error instanceof Error
          ? error.message
          : 'Could not start the camera. Check permissions and try again.',
      );
    },
  });

  const resumeScanning = () => {
    lastScannedRef.current = null;
    setPaused(false);
  };

  const handleSearch = async (rawBarcode: string) => {
    const barcode = rawBarcode.replace(/\D/g, '').trim();
    if (!barcode) {
      toast.error('Enter a valid barcode number.');
      resumeScanning();
      return;
    }

    setIsSearching(true);
    toast.loading(`Looking up ${barcode}...`, { id: 'barcode' });

    try {
      const res = await fetch(
        `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`,
      );

      if (!res.ok) {
        throw new Error(`Open Food Facts returned ${res.status}`);
      }

      const data = await res.json();

      if (data.status === 1 && data.product) {
        toast.success('Product found!', { id: 'barcode' });
        const p = data.product;
        const n = p.nutriments || {};
        const num = (key: string) => Number(n[key]) || 0;

        const foodData = {
          name: p.product_name || 'Unknown Scanned Product',
          brand: p.brands || '',
          serving_size: 100,
          serving_unit: 'g',
          calories: Math.round(num('energy-kcal_100g')),
          protein_g: Number(num('proteins_100g').toFixed(1)),
          carbs_g: Number(num('carbohydrates_100g').toFixed(1)),
          fats_g: Number(num('fat_100g').toFixed(1)),
          saturated_fats_g: Number(num('saturated-fat_100g').toFixed(1)),
          fiber_g: Number(num('fiber_100g').toFixed(1)),
          sugar_g: Number(num('sugars_100g').toFixed(1)),
          sodium_mg: Math.round(num('sodium_100g') * 1000),
        };

        onProductFound(foodData);
      } else {
        toast.error('Product not found in database.', { id: 'barcode' });
        resumeScanning();
      }
    } catch (error) {
      console.error('[scanner] lookup failed', error);
      toast.error('Failed to fetch product data.', { id: 'barcode' });
      resumeScanning();
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
            {paused ? 'PAUSED' : 'ALIGN BARCODE'}
          </span>
        </div>

        {torch.isAvailable && (
          <button
            onClick={() => (torch.isOn ? torch.off() : torch.on())}
            className="absolute bottom-3 right-3 bg-black/60 hover:bg-black/80 text-white text-[10px] font-mono px-3 py-2 rounded-lg backdrop-blur-sm border border-neutral-700 transition active:scale-95"
          >
            {torch.isOn ? 'TORCH OFF' : 'TORCH ON'}
          </button>
        )}

        {paused && !isSearching && (
          <button
            onClick={resumeScanning}
            className="absolute bottom-3 left-3 bg-emerald-600/90 hover:bg-emerald-500 text-white text-[10px] font-mono px-3 py-2 rounded-lg backdrop-blur-sm transition active:scale-95"
          >
            SCAN AGAIN
          </button>
        )}

        {cameraError && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center gap-3 p-6 text-center">
            <span className="text-red-400 text-xs font-mono uppercase tracking-wider">
              Camera unavailable
            </span>
            <p className="text-neutral-300 text-xs leading-relaxed">
              {cameraError}
            </p>
            <button
              onClick={() => {
                setCameraError(null);
                resumeScanning();
              }}
              className="mt-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[10px] font-mono px-4 py-2 rounded-lg transition"
            >
              RETRY
            </button>
          </div>
        )}
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
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={manualCode}
          onChange={(e) => setManualCode(e.target.value.replace(/\D/g, ''))}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && manualCode && !isSearching) {
              handleSearch(manualCode);
            }
          }}
          placeholder="Enter barcode number..."
          className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-sm font-mono text-white focus:outline-none focus:border-emerald-500 min-w-0"
        />
        <button
          onClick={() => handleSearch(manualCode)}
          disabled={isSearching || !manualCode}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 rounded-lg text-xs font-mono transition disabled:opacity-50 shrink-0"
        >
          {isSearching ? '...' : 'Search'}
        </button>
      </div>
    </div>
  );
}
