import { StatCard } from "@/components/profile/StatCard";
import type { ProfileStat } from "@/types/profile";

type ProfileStatsProps = {
  stats: ProfileStat[];
  className?: string;
};

export function ProfileStats({ className = "", stats }: ProfileStatsProps) {
  if (!stats.length) {
    return null;
  }

  const gridCols =
    stats.length === 3
      ? "grid-cols-3"
      : stats.length === 2
        ? "grid-cols-2"
        : "grid-cols-2 sm:grid-cols-4";

  return (
    <div
      className={`rounded-xl border border-white/8 bg-white/[0.02] p-1 ${className}`}
    >
      <div className={`grid ${gridCols} gap-0.5`}>
        {stats.map((stat) => (
          <StatCard
            hint={stat.hint}
            key={stat.label}
            label={stat.label}
            value={stat.value}
          />
        ))}
      </div>
    </div>
  );
}
