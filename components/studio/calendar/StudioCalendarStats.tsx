import Link from "next/link";
import { buildStudioManagerHref } from "@/lib/studio/manager-url";
import type { CalendarStats } from "@/types/scheduling";

type StudioCalendarStatsProps = {
  basePath: string;
  stats: CalendarStats;
};

export function StudioCalendarStats({ basePath, stats }: StudioCalendarStatsProps) {
  const cards = [
    {
      href: buildStudioManagerHref(basePath, { tab: "upcoming" }),
      id: "upcoming",
      label: "Sắp tới",
      value: stats.upcoming
    },
    {
      href: buildStudioManagerHref(basePath, { tab: "today" }),
      id: "today",
      label: "Hôm nay",
      value: stats.today
    },
    {
      href: buildStudioManagerHref(basePath, { tab: "published" }),
      id: "published7d",
      label: "Đã đăng 7 ngày",
      value: stats.published7d
    },
    {
      accent: stats.failed > 0,
      href: buildStudioManagerHref(basePath, { tab: "failed" }),
      id: "failed",
      label: "Lỗi đăng",
      value: stats.failed
    },
    {
      href: buildStudioManagerHref(basePath, { tab: "canceled" }),
      id: "canceled",
      label: "Đã hủy",
      value: stats.canceled
    }
  ];

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((card) => (
        <Link href={card.href} key={card.id}>
          <div
            className={`flex min-h-[4.5rem] flex-col justify-center rounded-xl border p-3 transition sm:min-h-[5rem] ${
              card.accent
                ? "border-rose-400/30 bg-rose-400/5 hover:border-rose-400/50"
                : "border-white/10 bg-white/[0.02] hover:border-cyan-300/30"
            }`}
          >
            <p className="text-lg font-black text-white sm:text-xl">
              {new Intl.NumberFormat("vi-VN").format(card.value)}
            </p>
            <p className="mt-0.5 text-[0.65rem] leading-tight text-zinc-400 sm:text-xs">
              {card.label}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
