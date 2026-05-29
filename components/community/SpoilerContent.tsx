"use client";

import { useState, type ReactNode } from "react";

type SpoilerContentProps = {
  children: ReactNode;
  isSpoiler: boolean;
  className?: string;
};

export function SpoilerContent({
  children,
  className = "",
  isSpoiler
}: SpoilerContentProps) {
  const [revealed, setRevealed] = useState(false);

  if (!isSpoiler || revealed) {
    return <div className={className}>{children}</div>;
  }

  return (
    <button
      className={`relative w-full overflow-hidden rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4 text-left transition hover:border-amber-400/35 ${className}`}
      onClick={() => setRevealed(true)}
      type="button"
    >
      <div className="pointer-events-none select-none blur-md">{children}</div>
      <span className="absolute inset-0 flex items-center justify-center bg-[#0b1016]/72 px-4 text-center text-sm font-semibold text-amber-200">
        Có spoiler — chạm để xem
      </span>
    </button>
  );
}
