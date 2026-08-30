"use client";

import { useEffect, useState } from "react";

const DURATION_MS = 10_000;

type LoveReadingProgressOverlayProps = {
  active: boolean;
  onComplete: () => void;
};

/**
 * Overlay phân tích ~10 giây — tiến độ 1% → 100% trước khi hiện kết quả.
 */
export function LoveReadingProgressOverlay({
  active,
  onComplete
}: LoveReadingProgressOverlayProps) {
  const [percent, setPercent] = useState(1);

  useEffect(() => {
    if (!active) {
      setPercent(1);
      return;
    }

    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const next = Math.min(100, Math.max(1, Math.round((elapsed / DURATION_MS) * 100)));
      setPercent(next);
      if (next >= 100) {
        window.clearInterval(timer);
        onComplete();
      }
    }, 80);

    return () => window.clearInterval(timer);
  }, [active, onComplete]);

  if (!active) {
    return null;
  }

  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0612]/88 px-4 backdrop-blur-sm"
      role="status"
    >
      <div className="w-full max-w-md rounded-2xl border border-rose-300/20 bg-zinc-950/95 p-6 text-center shadow-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-rose-200/90">
          Đang phân tích
        </p>
        <p className="mt-3 text-lg font-bold text-white">Năng lượng tình yêu đang kết nối…</p>
        <p className="mt-2 text-sm text-lavender-300/90">
          Hệ thống đang đọc tên, ngày sinh và các yếu tố tương hợp.
        </p>
        <div className="mt-6">
          <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-rose-400 via-pink-400 to-violet-400 transition-[width] duration-150 ease-out"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="mt-3 text-2xl font-black tabular-nums text-rose-100">{percent}%</p>
        </div>
      </div>
    </div>
  );
}

export const LOVE_READING_PROGRESS_MS = DURATION_MS;
