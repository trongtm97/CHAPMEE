"use client";

import { RankMedalIcon } from "@/components/rankings/MedalBadge";
import { SupporterShareButton } from "@/components/supporters/SupporterShareButton";
import { AvatarFallback } from "@/components/ui";
import type { SupporterRankingItem } from "@/types/tip";

type SupporterRankingProps = {
  title: string;
  subtitle?: string;
  items: SupporterRankingItem[];
  currentUserId?: string | null;
};

const PODIUM_RANK = [2, 1, 3] as const;

export function SupporterRanking({
  title,
  subtitle,
  items,
  currentUserId
}: SupporterRankingProps) {
  const topThree = items.slice(0, 3);
  const rest = items.slice(3, 5);

  return (
    <section
      aria-labelledby="supporter-ranking-heading"
      className="relative overflow-hidden rounded-2xl border border-red-500/25 bg-[var(--surface)] px-4 py-5 sm:px-6 sm:py-6"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(239,68,68,0.18),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(190,18,60,0.12),transparent_50%)]"
      />

      <div className="relative space-y-5">
        <header className="space-y-1.5">
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-red-300/90">
            Vinh danh fan
          </p>
          <h2 className="text-xl font-black tracking-tight text-white sm:text-2xl" id="supporter-ranking-heading">
            {title}
          </h2>
          {subtitle ? (
            <p className="max-w-2xl text-sm leading-6 text-zinc-300">{subtitle}</p>
          ) : null}
        </header>

        {items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-red-400/20 bg-red-500/[0.04] px-4 py-3 text-sm text-zinc-500">
            Chưa có dữ liệu ủng hộ tuần này.
          </p>
        ) : (
          <>
            {topThree.length > 0 ? (
              <div className="hidden items-end gap-3 sm:grid sm:grid-cols-3">
                {PODIUM_RANK.filter((rank) => topThree[rank - 1]).map((rank) => {
                  const item = topThree[rank - 1]!;
                  return (
                    <SupporterPodiumCard
                      currentUserId={currentUserId}
                      elevated={rank === 1}
                      item={item}
                      key={item.user_id}
                      rank={rank}
                    />
                  );
                })}
              </div>
            ) : null}

            {topThree.length > 0 ? (
              <div className="space-y-3 sm:hidden">
                {topThree.map((item, index) => (
                  <SupporterPodiumCard
                    currentUserId={currentUserId}
                    elevated={index === 0}
                    item={item}
                    key={item.user_id}
                    rank={(index + 1) as 1 | 2 | 3}
                  />
                ))}
              </div>
            ) : null}

            {rest.length > 0 ? (
              <div className="space-y-2">
                {rest.map((item, index) => (
                  <SupporterRow
                    currentUserId={currentUserId}
                    item={item}
                    key={item.user_id}
                    rank={index + 4}
                  />
                ))}
              </div>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}

function SupporterPodiumCard({
  item,
  rank,
  elevated = false,
  currentUserId
}: {
  item: SupporterRankingItem;
  rank: 1 | 2 | 3;
  elevated?: boolean;
  currentUserId?: string | null;
}) {
  const isSelf = Boolean(currentUserId && item.user_id === currentUserId);

  return (
    <article
      className={`flex flex-col rounded-2xl border p-3 sm:p-4 ${getPodiumStyles(rank)} ${
        elevated ? "sm:-translate-y-2 sm:scale-[1.02]" : ""
      } ${isSelf ? "ring-2 ring-red-400/40" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <RankMedalIcon rank={rank} />
          <span className="text-sm font-black text-red-100">#{rank}</span>
        </div>
        {!item.is_anonymous ? (
          <SupporterShareButton
            currentUserId={currentUserId}
            item={item}
            rank={rank}
            variant="icon"
          />
        ) : null}
      </div>

      <div className="mt-3 flex flex-col items-center text-center">
        <AvatarFallback
          className={`ring-2 ${rank === 1 ? "ring-red-400/50" : "ring-white/10"}`}
          name={item.display_name}
          size={elevated || rank === 1 ? "lg" : "md"}
          src={item.avatar_url}
        />
        <p className="mt-2 line-clamp-2 text-sm font-black text-white">{item.display_name}</p>
        <p className="mt-0.5 text-xs text-zinc-400">{item.tip_count} lượt ủng hộ</p>
        <p className="mt-2 text-lg font-black text-red-300 sm:text-xl">
          {item.total_coin.toLocaleString("vi-VN")}
          <span className="ml-1 text-xs font-bold text-red-200/70">coin</span>
        </p>
        {isSelf ? (
          <span className="mt-2 rounded-full border border-red-400/35 bg-red-500/15 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-red-200">
            Đang là bạn
          </span>
        ) : null}
        {!item.is_anonymous ? (
          <SupporterShareButton
            className="mt-3"
            currentUserId={currentUserId}
            item={item}
            rank={rank}
          />
        ) : null}
      </div>
    </article>
  );
}

function SupporterRow({
  item,
  rank,
  currentUserId
}: {
  item: SupporterRankingItem;
  rank: number;
  currentUserId?: string | null;
}) {
  const isSelf = Boolean(currentUserId && item.user_id === currentUserId);

  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 ${
        isSelf
          ? "border-red-400/30 bg-red-500/10"
          : "border-white/8 bg-white/[0.02]"
      }`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <span className="w-6 shrink-0 text-center text-xs font-black text-red-300/80">
          {rank}
        </span>
        <AvatarFallback
          className="ring-1 ring-white/10"
          name={item.display_name}
          size="sm"
          src={item.avatar_url}
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-white">{item.display_name}</p>
          <p className="text-xs text-zinc-500">{item.tip_count} lượt ủng hộ</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <p className="text-sm font-black text-red-300">
          {item.total_coin.toLocaleString("vi-VN")}
        </p>
        {!item.is_anonymous ? (
          <SupporterShareButton
            currentUserId={currentUserId}
            item={item}
            rank={rank}
            variant="icon"
          />
        ) : null}
      </div>
    </div>
  );
}

function getPodiumStyles(rank: 1 | 2 | 3) {
  if (rank === 1) {
    return "border-red-400/35 bg-gradient-to-b from-red-500/20 via-red-950/20 to-transparent shadow-[0_0_24px_rgba(239,68,68,0.12)]";
  }
  if (rank === 2) {
    return "border-red-400/20 bg-gradient-to-b from-red-500/10 to-transparent";
  }
  return "border-red-400/15 bg-gradient-to-b from-red-500/8 to-transparent";
}
