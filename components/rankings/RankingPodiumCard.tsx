"use client";

import Link from "next/link";
import { ChapMeeCover } from "@/components/common/ChapMeeCover";
import { getPodiumCardStyles, RankMedalIcon } from "@/components/rankings/MedalBadge";
import { RankingShareButton } from "@/components/rankings/RankingShareButton";
import { Badge, AvatarFallback } from "@/components/ui";
import { getPrimaryMetricLabel, getItemCtaLabel } from "@/lib/ranking/ranking-ui-utils";
import { REASON_BADGE_LABELS } from "@/lib/ranking/reason-badges";
import { getProfileUrl } from "@/lib/profile/profile-url";
import type { RankingBoardItem, RankingBoardType, RankingTimeWindow } from "@/types/ranking-board";

type PodiumRank = 1 | 2 | 3;

type RankingPodiumCardProps = {
  item: RankingBoardItem;
  boardLabel: string;
  boardType: RankingBoardType;
  timeWindow: RankingTimeWindow;
  periodLabel: string;
  elevated?: boolean;
};

export function RankingPodiumCard({
  item,
  boardLabel,
  boardType,
  timeWindow,
  periodLabel,
  elevated = false
}: RankingPodiumCardProps) {
  const rank = item.rank as PodiumRank;
  const styles = getPodiumCardStyles(rank);
  const metric = getPrimaryMetricLabel(item, boardType);
  const reasonLabel = item.reasonBadge ? REASON_BADGE_LABELS[item.reasonBadge] : null;
  const profileHref = item.authorUsername ? getProfileUrl(item.authorUsername) : null;

  return (
    <article
      className={`flex flex-col rounded-2xl border p-3 sm:p-4 ${styles.wrapper} ${
        elevated ? "sm:-translate-y-2 sm:scale-[1.02]" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <RankMedalIcon rank={rank} />
          <span className={`text-sm font-black ${styles.rankText}`}>#{item.rank}</span>
        </div>
        {reasonLabel ? <Badge variant="success">{reasonLabel}</Badge> : null}
      </div>

      <div className="mt-3 flex flex-col items-center text-center">
        {item.itemType === "author" ? (
          <AvatarFallback className="ring-2 ring-white/10" name={item.title} size="lg" />
        ) : (
          <ChapMeeCover
            alt={item.title}
            className={elevated ? "!w-24 sm:!w-28" : "!w-20 sm:!w-24"}
            size="sm"
            src={item.coverUrl}
            title={item.title}
          />
        )}

        <p className="mt-3 line-clamp-2 text-base font-black leading-snug text-white sm:text-lg">
          {item.title}
        </p>

        {item.authorDisplayName ? (
          <p className="mt-1 text-xs text-zinc-400">
            {profileHref ? (
              <Link
                className="tap-highlight hover:text-cyan-200"
                href={profileHref}
                onClick={(event) => event.stopPropagation()}
              >
                @{item.authorUsername}
              </Link>
            ) : (
              item.authorDisplayName
            )}
          </p>
        ) : null}

        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          {item.score > 0 ? (
            <span className="text-sm font-black text-cyan-200">{item.score.toFixed(1)} điểm</span>
          ) : null}
          {metric ? <span className="text-xs text-zinc-400">{metric}</span> : null}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Link
          className="tap-highlight inline-flex min-h-10 items-center justify-center rounded-full bg-cyan-300 px-3 text-xs font-black uppercase tracking-[0.08em] text-zinc-950 sm:text-sm"
          href={item.href}
        >
          {getItemCtaLabel(item.itemType, boardType)}
        </Link>
        <RankingShareButton
          context={{
            item,
            boardLabel,
            boardType,
            timeWindow,
            periodLabel
          }}
        />
      </div>
    </article>
  );
}
