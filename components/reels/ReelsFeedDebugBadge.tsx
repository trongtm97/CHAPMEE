"use client";

import type { ReelsItem } from "@/lib/reels/getReelsItems";

const DEBUG_ENABLED = process.env.NEXT_PUBLIC_FEED_DEBUG === "true";

type ReelsFeedDebugBadgeProps = {
  item: ReelsItem;
};

export function ReelsFeedDebugBadge({ item }: ReelsFeedDebugBadgeProps) {
  if (!DEBUG_ENABLED || !item.feed) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute left-3 top-[calc(env(safe-area-inset-top)+0.75rem)] z-30 rounded-md border border-cyan-300/30 bg-black/60 px-2 py-1 font-mono text-[0.62rem] leading-5 text-cyan-100">
      <p>{item.feed.candidatePool}</p>
      <p className="text-zinc-400">
        #{item.feed.rankPosition ?? "?"} · {item.feed.algorithmVersion}
      </p>
    </div>
  );
}
