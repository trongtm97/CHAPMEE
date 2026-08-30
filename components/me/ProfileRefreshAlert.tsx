"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const DEFAULT_MESSAGE =
  "Không thể cập nhật dữ liệu mới. Đang hiển thị dữ liệu gần nhất.";

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
  }, [message]);

  if (!message || !visible) {
    return null;
  }

  const displayMessage =
    message === "Đang dùng dữ liệu gần nhất." || message === "Đang dùng dữ liệu gần nhất"
      ? DEFAULT_MESSAGE
      : message;

  if (severity === "critical") {
    return (
      <div
        className="flex items-start gap-3 rounded-xl border border-amber-300/25 bg-amber-300/10 px-3 py-2.5"
        role="alert"
      >
        <p className="min-w-0 flex-1 text-xs font-medium leading-5 text-amber-100">
          {displayMessage}
        </p>
        <button
          className="tap-highlight shrink-0 rounded-full border border-amber-200/30 px-2.5 py-1 text-[0.65rem] font-bold text-amber-100"
          onClick={() => router.refresh()}
          type="button"
        >
          Thử lại
        </button>
        <button
          aria-label="Đóng"
          className="tap-highlight shrink-0 text-amber-200/70 hover:text-amber-100"
          onClick={() => setVisible(false)}
          type="button"
        >
          ×
        </button>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-2 rounded-xl border border-amber-300/20 bg-amber-300/[0.06] px-3 py-2"
      role="alert"
    >
      <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-amber-300/90" />
      <p className="min-w-0 flex-1 text-[0.68rem] leading-snug text-amber-100/95">
        {displayMessage}
      </p>
      <button
        className="tap-highlight shrink-0 text-[0.65rem] font-semibold text-cyan-200"
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
