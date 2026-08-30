"use client";

import { useState } from "react";
import {
  buildSupporterShareText,
  buildSupporterShareUrl
} from "@/lib/ranking/supporter-share";
import type { SupporterRankingItem } from "@/types/tip";

type SupporterShareButtonProps = {
  item: SupporterRankingItem;
  rank: number;
  currentUserId?: string | null;
  variant?: "button" | "icon";
  className?: string;
};

export function SupporterShareButton({
  item,
  rank,
  currentUserId,
  variant = "button",
  className = ""
}: SupporterShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const shareUrl = buildSupporterShareUrl();
  const isSelf = Boolean(currentUserId && item.user_id === currentUserId);
  const text = buildSupporterShareText(item, rank, shareUrl, isSelf);

  async function handleShare(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "Top fan ủng hộ ChapMee",
          text,
          url: shareUrl
        });
        return;
      } catch {
        // fall through to copy
      }
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Sao chép liên kết:", text);
    }
  }

  if (variant === "icon") {
    return (
      <button
        aria-label={`Chia sẻ hạng ${rank}`}
        className={`tap-highlight inline-flex size-8 items-center justify-center rounded-full border border-red-400/25 bg-red-500/10 text-red-200 transition hover:border-red-400/45 hover:bg-red-500/20 hover:text-red-100 ${className}`}
        onClick={handleShare}
        type="button"
      >
        <ShareIcon />
      </button>
    );
  }

  return (
    <button
      className={`tap-highlight inline-flex items-center gap-1.5 rounded-full border border-red-400/30 bg-red-500/15 px-3 py-1.5 text-xs font-bold text-red-100 transition hover:border-red-400/50 hover:bg-red-500/25 ${className}`}
      onClick={handleShare}
      type="button"
    >
      <ShareIcon className="size-3.5" />
      {copied ? "Đã sao chép!" : isSelf ? "Khoe huy hiệu" : "Chia sẻ"}
    </button>
  );
}

function ShareIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24">
      <path
        d="M13.5 4.5 18 9l-4.5 4.5V11H8v2h6v2.5L18 15l-4.5-4.5H11V4.5h2.5ZM6 7a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-4h-2v4H6V9h4V7H6Z"
        fill="currentColor"
      />
    </svg>
  );
}
