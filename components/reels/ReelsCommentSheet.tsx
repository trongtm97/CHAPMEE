"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ReelsCommentsBody } from "@/components/reels/ReelsCommentsBody";
import type { ReelsAnalyticsContext } from "@/lib/analytics/trackReelsEvents";

type ReelsCommentSheetProps = {
  context: ReelsAnalyticsContext | null;
  onClose: () => void;
  onCommentCreated: () => void;
  open: boolean;
};

function CloseIcon() {
  return (
    <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24">
      <path
        d="m6 6 12 12M18 6 6 18"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function ReelsCommentSheet({
  context,
  onClose,
  onCommentCreated,
  open
}: ReelsCommentSheetProps) {
  const [mounted, setMounted] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  if (!open || !context || !mounted) {
    return null;
  }

  return createPortal(
    <div
      aria-labelledby="reels-comment-sheet-title"
      aria-modal="true"
      className="fixed inset-0 z-[80] flex items-end bg-black/55 backdrop-blur-[6px]"
      role="dialog"
    >
      <button
        aria-label="Đóng bình luận"
        className="absolute inset-0"
        onClick={onClose}
        type="button"
      />

      <section className="relative z-10 flex h-[min(78dvh,720px)] w-full flex-col overflow-hidden rounded-t-[1.75rem] bg-white text-[#111827] shadow-[0_-24px_60px_rgba(0,0,0,0.34)] motion-reduce:transition-none">
        <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-[#d1d5db]" />

        <header className="flex shrink-0 items-center gap-2 border-b border-[#e5e7eb] px-4 py-2.5 sm:px-5">
          <h2
            className="min-w-0 flex-1 text-center text-[0.95rem] font-bold leading-tight text-[#111827]"
            id="reels-comment-sheet-title"
          >
            Bình luận{" "}
            <span className="font-semibold tabular-nums text-[#6b7280]">{totalCount}</span>
          </h2>
          <button
            className="tap-highlight inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#6b7280] transition hover:bg-[#f3f4f6] hover:text-[#111827]"
            onClick={onClose}
            type="button"
          >
            <CloseIcon />
          </button>
        </header>

        <ReelsCommentsBody
          active={open}
          context={context}
          onCommentCreated={onCommentCreated}
          onTotalCountChange={setTotalCount}
          variant="sheet"
        />
      </section>
    </div>,
    document.body
  );
}
