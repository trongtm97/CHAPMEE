"use client";

import { useEffect } from "react";

type MessageToastProps = {
  message: string | null;
  onDismiss?: () => void;
  durationMs?: number;
};

export function MessageToast({
  message,
  onDismiss,
  durationMs = 2800
}: MessageToastProps) {
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => onDismiss?.(), durationMs);
    return () => window.clearTimeout(timer);
  }, [message, durationMs, onDismiss]);

  if (!message) return null;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+5.25rem)] z-[60] mx-auto max-w-sm rounded-2xl border border-white/10 bg-[#121820]/96 px-4 py-3 text-center text-sm text-zinc-100 shadow-xl backdrop-blur-md lg:bottom-8"
      role="status"
    >
      {message}
    </div>
  );
}
