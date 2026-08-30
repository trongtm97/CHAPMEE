"use client";

import Link from "next/link";
import { ChapMeeCover } from "@/components/common/ChapMeeCover";
import { RankingShareButton } from "@/components/rankings/RankingShareButton";
import { Badge, AvatarFallback } from "@/components/ui";
import { getPrimaryMetricLabel } from "@/lib/ranking/ranking-ui-utils";
import { REASON_BADGE_LABELS } from "@/lib/ranking/reason-badges";
import { getProfileUrl } from "@/lib/profile/profile-url";
import { StoryAudioBadge } from "@/src/components/story/StoryAudioBadge";
import type { RankingBoardItem, RankingBoardType, RankingTimeWindow } from "@/types/ranking-board";

type RankingListItemProps = {
  item: RankingBoardItem;
  boardLabel: string;
  boardType: RankingBoardType;
  timeWindow: RankingTimeWindow;
  periodLabel: string;
};

export function RankingListItem({
  item,
  boardLabel,
  boardType,
  timeWindow,
  periodLabel
}: RankingListItemProps) {
  const metric = getPrimaryMetricLabel(item, boardType);
  const reasonLabel = item.reasonBadge ? REASON_BADGE_LABELS[item.reasonBadge] : null;
  const profileHref = item.authorUsername ? getProfileUrl(item.authorUsername) : null;

  return (
    <Link
      className="tap-highlight group flex items-center gap-3 rounded-xl border border-white/8 bg-[var(--surface)] px-3 py-2.5 transition hover:border-white/15 hover:bg-[var(--surface-soft)]"
      href={item.href}
    >
      <span className="w-8 shrink-0 text-center text-sm font-black tabular-nums text-zinc-400">
        {item.rank}
      </span>

      {item.itemType === "author" ? (
        <AvatarFallback className="ring-1 ring-white/10" name={item.title} size="md" />
      ) : (
        <ChapMeeCover
          alt={item.title}
          className="!w-14 shrink-0 rounded-lg sm:!w-16"
          size="xs"
          src={item.coverUrl}
          title={item.title}
        />
      )}

      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm font-bold leading-snug text-white sm:text-[0.95rem]">
          {item.title}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-zinc-400">
          {profileHref ? (
            <span
              className="truncate hover:text-cyan-200"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                window.location.href = profileHref;
              }}
            >
              @{item.authorUsername}
            </span>
          ) : item.authorDisplayName ? (
            <span className="truncate">{item.authorDisplayName}</span>
          ) : null}
          {item.genreName ? <span className="truncate">{item.genreName}</span> : null}
          {metric ? <span className="truncate">{metric}</span> : null}
        </div>
        {item.itemType === "story" ? (
          <StoryAudioBadge
            className="mt-1"
            hasContinuousPlayback={item.hasContinuousPlayback}
            hasPublishedAudio={item.hasPublishedAudio}
          />
        ) : null}
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <div className="flex items-center gap-1.5">
          {reasonLabel ? (
            <Badge className="hidden sm:inline-flex" variant="success">
              {reasonLabel}
            </Badge>
          ) : null}
          {item.score > 0 ? (
            <span className="text-xs font-black text-cyan-200 sm:text-sm">
              {boardType === "boosted_stories"
                ? Math.round(item.score).toLocaleString("vi-VN")
                : item.score.toFixed(1)}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          <RankingShareButton
            context={{
              item,
              boardLabel,
              boardType,
              timeWindow,
              periodLabel
            }}
            variant="icon"
          />
          <span
            aria-hidden="true"
            className="text-zinc-600 transition group-hover:text-zinc-400"
          >
            ›
          </span>
        </div>
      </div>
    </Link>
  );
}
