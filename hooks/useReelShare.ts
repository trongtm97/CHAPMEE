"use client";

import { useCallback, useState } from "react";
import type { ReelsItem } from "@/lib/reels/getReelsItems";

export function useReelShare() {
  const [toast, setToast] = useState<string | null>(null);

  const shareReel = useCallback(async (item: ReelsItem) => {
    const path = item.reelHref ?? item.readMoreHref;
    const url = `${window.location.origin}${path}`;
    const title = `${item.hookTitle} · ${item.storyTitle}`;
    const text = item.excerpt.slice(0, 160);

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return true;
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return false;
        }
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setToast("Đã sao chép liên kết");
      window.setTimeout(() => setToast(null), 2400);
      return true;
    } catch {
      setToast("Không thể chia sẻ liên kết");
      window.setTimeout(() => setToast(null), 2400);
      return false;
    }
  }, []);

  return { shareReel, toast, clearToast: () => setToast(null) };
}
