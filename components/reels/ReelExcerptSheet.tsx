"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  REELS_TITLE_TEXT_CLASS,
  ReelExcerptText
} from "@/components/reels/ReelExcerptText";

type ReelExcerptSheetProps = {
  excerpt: string;
  onClose: () => void;
  open: boolean;
  title: string;
};

export function ReelExcerptSheet({ excerpt, onClose, open, title }: ReelExcerptSheetProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open || !mounted) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/55 pb-[calc(3.25rem+env(safe-area-inset-bottom,0px))] backdrop-blur-[4px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reel-excerpt-sheet-title"
    >
      <button
        aria-label="Đóng nội dung"
        className="absolute inset-0"
        onClick={onClose}
        type="button"
      />

      <section
        className="relative z-10 flex w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-[#0b1016] shadow-[0_-20px_48px_rgba(0,0,0,0.5)]"
        style={{ height: "min(72dvh, 560px)" }}
      >
        <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-white/20" />

        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-white/8 px-5 py-3">
          <h3
            className={`line-clamp-3 min-w-0 flex-1 text-sm leading-[1.4] ${REELS_TITLE_TEXT_CLASS}`}
            id="reel-excerpt-sheet-title"
          >
            {title}
          </h3>
          <button
            className="tap-highlight shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold text-zinc-400 hover:bg-white/6 hover:text-zinc-200"
            onClick={onClose}
            type="button"
          >
            Đóng
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5">
          <ReelExcerptText excerpt={excerpt} />
        </div>
      </section>
    </div>,
    document.body
  );
}
