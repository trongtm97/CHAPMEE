import Link from "next/link";
import { buildStudioManagerHref } from "@/lib/studio/manager-url";
import type { StudioDraftStats } from "@/types/drafts";

type StudioDraftsStatsProps = {
  basePath: string;
  stats: StudioDraftStats;
};

type StatCard = {
  id: string;
  label: string;
  value: number;
  href?: string;
  accent?: boolean;
};

export function StudioDraftsStats({ basePath, stats }: StudioDraftsStatsProps) {
  const cards: StatCard[] = [
    { id: "total", label: "Tổng nháp", value: stats.total },
    {
      href: buildStudioManagerHref(basePath, { type: "story" }),
      id: "story",
      label: "Nháp truyện",
      value: stats.story
    },
    {
      href: buildStudioManagerHref(basePath, { type: "chapter" }),
      id: "chapter",
      label: "Nháp chương",
      value: stats.chapter
    },
    {
      href: buildStudioManagerHref(basePath, { type: "reels" }),
      id: "reels",
      label: "Nháp Reels",
      value: stats.reels
    },
    {
      href: buildStudioManagerHref(basePath, { type: "seo" }),
      id: "seo",
      label: "Nháp SEO",
      value: stats.seo
    },
    {
      accent: stats.atRisk > 0,
      href: buildStudioManagerHref(basePath, { status: "has_errors" }),
      id: "atRisk",
      label: "Có rủi ro mất dữ liệu",
      value: stats.atRisk
    },
    {
      accent: stats.stale > 0,
      href: buildStudioManagerHref(basePath, { status: "stale", time: "older" }),
      id: "stale",
      label: "Nháp cũ trên 30 ngày",
      value: stats.stale
    }
  ];

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
      {cards.map((card) => {
        const inner = (
          <div
            className={`flex min-h-[4.5rem] flex-col justify-center rounded-xl border p-3 transition sm:min-h-[5rem] ${
              card.accent
                ? "border-amber-400/30 bg-amber-400/5 hover:border-amber-400/50"
                : "border-white/10 bg-white/[0.02] hover:border-cyan-300/30"
            }`}
          >
            <p className="text-lg font-black text-white sm:text-xl">
              {new Intl.NumberFormat("vi-VN").format(card.value)}
            </p>
            <p className="mt-0.5 line-clamp-2 text-[0.65rem] leading-tight text-zinc-400 sm:text-xs">
              {card.label}
            </p>
          </div>
        );

        if (card.href) {
          return (
            <Link href={card.href} key={card.id}>
              {inner}
            </Link>
          );
        }

        return <div key={card.id}>{inner}</div>;
      })}
    </div>
  );
}
