"use client";

import Link from "next/link";
import Image from "next/image";
import { TrackedStoryLink } from "@/components/tracking/TrackedStoryLink";
import { Card, Badge, AvatarFallback } from "@/components/ui";
import { getProfileUrlOrFallback } from "@/lib/profile/profile-url";
import { REASON_BADGE_LABELS } from "@/lib/ranking/reason-badges";
import type { RankingBoardItem } from "@/types/ranking-board";

type RankingBoardCardProps = {
  item: RankingBoardItem;
};

export function RankingBoardCard({ item }: RankingBoardCardProps) {
  const rankColor =
    item.rank === 1
      ? "text-amber-300"
      : item.rank === 2
        ? "text-zinc-200"
        : item.rank === 3
          ? "text-orange-400"
          : "text-zinc-400";

  const rankBg =
    item.rank <= 3
      ? "bg-white/10 border-white/15"
      : "bg-white/[0.04] border-white/8";

  const reasonLabel = item.reasonBadge ? REASON_BADGE_LABELS[item.reasonBadge] : null;

  const inner = (
    <Card className="space-y-3 transition hover:-translate-y-0.5 hover:border-cyan-300/30 hover:bg-[var(--surface-soft)]">
      <div className="flex items-start gap-3">
        <div
          className={`flex h-12 w-10 shrink-0 flex-col items-center justify-center rounded-xl border text-center ${rankBg}`}
        >
          <span className={`text-sm font-black leading-none ${rankColor}`}>
            {item.rank}
          </span>
        </div>

        {item.coverUrl ? (
          <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-lg border border-white/10">
            <Image
              alt=""
              className="object-cover"
              fill
              sizes="48px"
              src={item.coverUrl}
            />
          </div>
        ) : item.itemType === "author" ? (
          <AvatarFallback
            className="ring-1 ring-white/10"
            name={item.title}
            size="md"
          />
        ) : null}

        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-lg font-black leading-6 tracking-normal text-white">
            {item.title}
          </h3>
          <p className="mt-1 truncate text-xs font-medium text-zinc-400">
            {item.authorDisplayName ? (
              <Link
                className="hover:text-cyan-200"
                href={getProfileUrlOrFallback(item.authorUsername)}
                onClick={(event) => event.stopPropagation()}
              >
                {item.authorDisplayName}
              </Link>
            ) : (
              "ChapMee"
            )}
            {item.genreName ? ` · ${item.genreName}` : ""}
          </p>
          {item.statsLine ? (
            <p className="mt-1 text-xs text-zinc-500">{item.statsLine}</p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          {reasonLabel ? <Badge variant="success">{reasonLabel}</Badge> : null}
          {item.score > 0 ? (
            <Badge variant="default">{item.score.toFixed(1)} điểm</Badge>
          ) : null}
        </div>
      </div>

      {item.subtitle ? (
        <p className="line-clamp-2 text-sm leading-6 text-zinc-300">{item.subtitle}</p>
      ) : null}

      <span className="inline-flex min-h-11 items-center justify-center rounded-full bg-cyan-300 px-4 text-sm font-black uppercase tracking-[0.12em] text-zinc-950">
        {item.itemType === "author" ? "Xem tác giả" : "Xem ngay"}
      </span>
    </Card>
  );

  if (item.itemType === "story" && item.slug) {
    return (
      <TrackedStoryLink
        className="tap-highlight block"
        href={item.href}
        position={item.rank}
        storyId={item.id}
        surface="ranking"
      >
        {inner}
      </TrackedStoryLink>
    );
  }

  return (
    <Link className="tap-highlight block" href={item.href}>
      {inner}
    </Link>
  );
}
