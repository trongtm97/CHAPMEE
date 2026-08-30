"use client";

import { ChapMeeCover } from "@/components/common/ChapMeeCover";
import { getMedalTierStyles, RankingRankMedal } from "@/components/rankings/MedalBadge";
import { AvatarFallback } from "@/components/ui";
import { BRAND_LOGO_PATH, brandAssetUrl } from "@/lib/brand/constants";
import type { RankingShareBadgeData } from "@/lib/ranking/ranking-share";

type RankingShareCardProps = {
  data: RankingShareBadgeData;
  compact?: boolean;
};

export function RankingShareCard({ data, compact = false }: RankingShareCardProps) {
  const styles = getMedalTierStyles(data.medalTier);

  return (
    <div
      className={`overflow-hidden rounded-[1.5rem] border ${styles.frame} shadow-[0_20px_48px_rgba(0,0,0,0.28)]`}
    >
      <div className={`relative ${compact ? "p-4" : "p-5 sm:p-6"}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt="ChapMee"
              className="h-6 w-auto object-contain object-left"
              src={brandAssetUrl(BRAND_LOGO_PATH)}
            />
            <p className="mt-2 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-zinc-400">
              Bảng xếp hạng ChapMee
            </p>
          </div>
          <RankingRankMedal rank={data.rank} size={compact ? "sm" : "md"} />
        </div>

        <div className="mt-4 flex gap-4">
          {data.itemType === "author" ? (
            <AvatarFallback
              className="ring-2 ring-white/10"
              name={data.title}
              size={compact ? "md" : "lg"}
            />
          ) : (
            <ChapMeeCover
              alt={data.title}
              className={compact ? "!w-20" : "!w-24"}
              size="sm"
              src={data.coverUrl}
              title={data.title}
            />
          )}

          <div className="min-w-0 flex-1">
            <p className={`font-black leading-tight text-white ${compact ? "text-lg" : "text-xl"}`}>
              #{data.rank}
            </p>
            <p className={`mt-1 font-bold ${styles.accent}`}>{data.boardLabel}</p>
            <p className="mt-0.5 text-xs text-zinc-400">{data.periodLabel}</p>
            <p className={`mt-2 line-clamp-2 font-black text-white ${compact ? "text-base" : "text-lg"}`}>
              {data.title}
            </p>
            {data.authorUsername ? (
              <p className="mt-1 text-sm text-zinc-400">@{data.authorUsername}</p>
            ) : null}
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-zinc-300">
              {data.score > 0 ? (
                <span className="rounded-full border border-white/10 px-2 py-0.5 font-bold text-cyan-200">
                  {data.score.toFixed(1)} điểm
                </span>
              ) : null}
              {data.metric ? (
                <span className="rounded-full border border-white/10 px-2 py-0.5">
                  {data.metric}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-cyan-200">
            {data.ctaLabel}
          </p>
          <p className="mt-1 break-all text-[0.7rem] leading-5 text-zinc-500">{data.shareUrl}</p>
        </div>
      </div>
    </div>
  );
}
