'use client';

/* Shared frame for every suggestion card, so a meal, a routine and a body fat
   reading all sit at the same visual level in the thread */
export default function CardShell({
  label,
  title,
  meta,
  children,
}: {
  label: string;
  title: string;
  meta?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 shadow-md">
      <p className="text-[10px] font-mono text-emerald-500/80 mb-2 uppercase tracking-wider">
        {label}
      </p>
      <div className="flex justify-between items-baseline gap-3 mb-3">
        <h4 className="font-bold text-emerald-400 text-sm">{title}</h4>
        {meta && (
          <span className="text-[10px] font-mono text-neutral-500 shrink-0">
            {meta}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
