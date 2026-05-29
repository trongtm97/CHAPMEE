"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

type ReaderSheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
};

export function ReaderSheet({
  children,
  className = "",
  onClose,
  open,
  title
}: ReaderSheetProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, open]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[200]">
      <button
        aria-label="Đóng"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        type="button"
      />
      <div
        aria-labelledby="reader-sheet-title"
        aria-modal="true"
        className={`absolute inset-x-0 bottom-0 z-10 mx-auto max-h-[88dvh] w-full max-w-lg overflow-hidden rounded-t-2xl border border-white/10 bg-[#0b1016] shadow-[0_-20px_60px_rgba(0,0,0,0.45)] lg:bottom-auto lg:left-1/2 lg:top-1/2 lg:max-h-[min(88dvh,42rem)] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-2xl ${className}`.trim()}
        role="dialog"
      >
        <div className="flex items-center justify-between gap-3 border-b border-white/8 px-4 py-3">
          <h2 className="text-base font-black text-zinc-50" id="reader-sheet-title">
            {title}
          </h2>
          <button
            className="min-h-9 rounded-full px-3 text-sm font-semibold text-zinc-400 hover:text-zinc-200"
            onClick={onClose}
            type="button"
          >
            Đóng
          </button>
        </div>
        <div className="max-h-[calc(88dvh-3.25rem)] overflow-y-auto overscroll-contain px-4 py-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
