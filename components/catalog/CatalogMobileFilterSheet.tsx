"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";

type CatalogMobileFilterSheetProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
};

export function CatalogMobileFilterSheet({
  open,
  onClose,
  title = "Bộ lọc nâng cao",
  children
}: CatalogMobileFilterSheetProps) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        aria-label="Đóng bộ lọc"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        type="button"
      />
      <div className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-2xl border border-white/10 bg-[#0b1016] p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-white">{title}</h2>
          <button
            className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-zinc-200"
            onClick={onClose}
            type="button"
          >
            Đóng
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
