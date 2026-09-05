'use client';

import { Info } from 'lucide-react';

interface ExerciseHowToProps {
  name: string;
  photoUrl?: string | null;
  instructions?: string[];
}

/* How To Perform: reference photo + step-by-step form cues */
export default function ExerciseHowTo({
  name,
  photoUrl,
  instructions,
}: ExerciseHowToProps) {
  if (!photoUrl && !(instructions && instructions.length > 0)) return null;

  return (
    <div className="bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden shadow-sm">
      {photoUrl && (
        <img
          src={photoUrl}
          alt={name}
          className="w-full h-44 object-cover object-top bg-neutral-900"
          loading="lazy"
        />
      )}
      {instructions && instructions.length > 0 && (
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Info size={16} className="text-indigo-400" />
            <h3 className="font-bold text-white text-sm tracking-tight uppercase">
              How To Perform
            </h3>
          </div>
          <ol className="space-y-2.5">
            {instructions.map((step: string, i: number) => (
              <li
                key={i}
                className="flex gap-3 text-sm text-neutral-300 leading-relaxed"
              >
                <span className="shrink-0 w-5 h-5 rounded-full bg-neutral-800 text-neutral-400 text-[10px] font-mono font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
