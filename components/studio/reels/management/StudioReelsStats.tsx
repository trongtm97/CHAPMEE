import Link from "next/link";
import { buildStudioManagerHref } from "@/lib/studio/manager-url";
import { studioPath } from "@/lib/studio/constants";
import type { ReelsStudioStats } from "@/types/reels";

type StudioReelsStatsProps = {
  basePath: string;
  stats: ReelsStudioStats;
};

export function StudioReelsStats({ basePath, stats }: StudioReelsStatsProps) {
  const cards = [
    { href: buildStudioManagerHref(basePath, {}), id: "total", label: "Tổng Reels", value: stats.total },
    {
      href: buildStudioManagerHref(basePath, { tab: "published" }),
      id: "published",
      label: "Đang đăng",
      value: stats.published
    },
    {
      href: buildStudioManagerHref(basePath, { tab: "draft" }),
      id: "draft",
      label: "Nháp",
      value: stats.draft
    },
    {
      href: buildStudioManagerHref(basePath, { tab: "scheduled" }),
      id: "scheduled",
      label: "Đã lên lịch",
      value: stats.scheduled
    },
    {
      accent: stats.needsFix > 0,
      href: buildStudioManagerHref(basePath, { tab: "needs_fix" }),
      id: "needsFix",
      label: "Cần sửa",
      value: stats.needsFix
    },
    { id: "views7d", label: "Lượt xem 7 ngày", value: stats.views7d },
    { id: "ctr", label: "CTR vào truyện", suffix: "%", value: stats.ctr7d },
    {
      id: "reads",
      label: "Lượt đọc từ Reels",
      value: stats.readsFromReels
    }
  ];

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">
      {cards.map((card) => {
        const inner = (
          <div
            className={`flex min-h-[4.25rem] flex-col justify-center rounded-xl border p-2.5 sm:min-h-[4.75rem] sm:p-3 ${
              card.accent
                ? "border-amber-400/30 bg-amber-400/5"
                : "border-white/10 bg-white/[0.02] hover:border-cyan-300/30"
            }`}
          >
            <p className="text-lg font-black text-white sm:text-xl">
              {new Intl.NumberFormat("vi-VN").format(card.value)}
              {card.suffix ?? ""}
            </p>
            <p className="mt-0.5 line-clamp-2 text-[0.6rem] leading-tight text-zinc-400 sm:text-xs">
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
