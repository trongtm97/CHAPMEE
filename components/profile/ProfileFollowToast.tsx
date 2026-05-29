"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export function ProfileFollowToast() {
  const searchParams = useSearchParams();
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const toastParam = searchParams.get("toast");
    if (toastParam === "followed") {
      setToast("Đã theo dõi người dùng.");
    } else if (toastParam === "unfollowed") {
      setToast("Đã bỏ theo dõi.");
    }
    if (!toastParam) {
      return;
    }
    const timer = window.setTimeout(() => setToast(null), 2400);
    return () => window.clearTimeout(timer);
  }, [searchParams]);

  if (!toast) {
    return null;
  }

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] z-50 mx-auto max-w-sm rounded-full border border-white/10 bg-[#121820]/95 px-4 py-2.5 text-center text-xs font-medium text-zinc-100 shadow-lg backdrop-blur-md"
      role="status"
    >
      {toast}
    </div>
  );
}
