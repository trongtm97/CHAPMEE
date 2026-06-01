import Link from "next/link";
import type { StudioQuickStat } from "@/types/creator";

type StudioQuickStatsProps = {
  stats: StudioQuickStat[];
  compact?: boolean;
};

function formatValue(stat: StudioQuickStat) {
  if (stat.format === "currency") {
    return new Intl.NumberFormat("vi-VN", {
      currency: "VND",
      maximumFractionDigits: 0,
      notation: stat.value >= 1_000_000 ? "compact" : "standard",
      style: "currency"
    }).format(stat.value);
  }

  return new Intl.NumberFormat("vi-VN", {
    notation: stat.value >= 10_000 ? "compact" : "standard"
  }).format(stat.value);
}

export function StudioQuickStats({ compact = false, stats }: StudioQuickStatsProps) {
  return (
    <div
      className={
        compact
          ? "grid grid-cols-3 gap-1.5 sm:grid-cols-2 sm:gap-2 lg:grid-cols-2"
          : "grid grid-cols-3 gap-1.5 sm:grid-cols-2 sm:gap-2 lg:grid-cols-3 xl:grid-cols-6"
      }
    >
      {stats.map((stat) => {
        const inner = (
          <div
            className={`flex flex-col justify-center rounded-lg border border-white/10 bg-white/[0.02] transition hover:border-cyan-300/30 ${
              compact ? "px-1.5 py-1.5 sm:px-2 sm:py-2" : "min-h-[4.5rem] p-2.5 sm:min-h-[5.5rem] sm:p-3"
            }`}
          >
            <p
              className={`truncate font-black text-white ${
                compact ? "text-sm sm:text-base" : "text-lg sm:text-xl"
              }`}
            >
              {formatValue(stat)}
            </p>
            <p className="line-clamp-2 text-[0.6rem] leading-tight text-zinc-400 sm:text-xs">
              {stat.label}
            </p>
          </div>
        );

        if (stat.href) {
          return (
            <Link href={stat.href} key={stat.id}>
              {inner}
            </Link>
          );
        }

        return <div key={stat.id}>{inner}</div>;
      })}
    </div>
  );
}

/** @deprecated Use StudioQuickStats */
export const StudioStatsGrid = StudioQuickStats;
