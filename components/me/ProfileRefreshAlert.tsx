"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type ProfileRefreshAlertProps = {
  message?: string | null;
  severity?: "soft" | "critical";
};

export function ProfileRefreshAlert({
  message,
  severity = "soft"
}: ProfileRefreshAlertProps) {
  const router = useRouter();
  const [visible, setVisible] = useState(Boolean(message));

  useEffect(() => {
    setVisible(Boolean(message));
    if (!message || severity !== "soft") {
      return;
    }
    const timer = window.setTimeout(() => setVisible(false), 6000);
    return () => window.clearTimeout(timer);
  }, [message, severity]);

  if (!message || !visible) {
    return null;
  }

  if (severity === "critical") {
    return (
      <div
        className="flex items-start gap-3 rounded-2xl border border-amber-300/25 bg-amber-300/10 px-4 py-3"
        role="alert"
      >
        <p className="min-w-0 flex-1 text-sm font-semibold text-amber-100">{message}</p>
        <button
          className="tap-highlight shrink-0 rounded-full border border-amber-200/30 px-3 py-1 text-xs font-bold text-amber-100"
          onClick={() => router.refresh()}
          type="button"
        >
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-zinc-400"
      role="status"
    >
      <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-amber-300/80" />
      <span className="min-w-0 flex-1 truncate">Đang dùng dữ liệu gần nhất.</span>
      <button
        className="tap-highlight shrink-0 font-semibold text-cyan-200"
        onClick={() => router.refresh()}
        type="button"
      >
        Thử lại
      </button>
      <button
        aria-label="Đóng"
        className="tap-highlight shrink-0 text-zinc-500 hover:text-zinc-300"
        onClick={() => setVisible(false)}
        type="button"
      >
        ×
      </button>
    </div>
  );
}
