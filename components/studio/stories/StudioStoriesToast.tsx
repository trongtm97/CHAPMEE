"use client";

import { useEffect, useRef } from "react";

type StudioStoriesToastProps = {
  message: string | null;
  onDismiss: () => void;
  variant?: "success" | "error";
};

export function StudioStoriesToast({
  message,
  onDismiss,
  variant = "success"
}: StudioStoriesToastProps) {
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!message) {
      return;
    }

    timerRef.current = window.setTimeout(onDismiss, 4000);

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, [message, onDismiss]);

  if (!message) {
    return null;
  }

  const tone =
    variant === "error"
      ? "border-red-400/30 bg-red-950/90 text-red-100"
      : "border-emerald-400/30 bg-emerald-950/90 text-emerald-100";

  return (
    <div
      className={`fixed bottom-20 left-1/2 z-50 w-[min(92vw,24rem)] -translate-x-1/2 rounded-xl border px-4 py-3 text-sm font-medium shadow-xl sm:bottom-6 ${tone}`}
      role="status"
    >
      {message}
    </div>
  );
}
