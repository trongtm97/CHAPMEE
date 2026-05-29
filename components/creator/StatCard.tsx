import type { DashboardStatCard } from "@/lib/creator/getCreatorDashboardData";

type StatCardProps = {
  stat: DashboardStatCard;
};

const gradientMap: Record<string, string> = {
  "👁️": "from-cyan-500/20 via-sky-500/10 to-blue-600/20",
  "❤️": "from-rose-500/20 via-pink-500/10 to-red-600/20",
  "⭐": "from-amber-400/20 via-yellow-500/10 to-orange-600/20",
  "💬": "from-emerald-400/20 via-teal-500/10 to-cyan-600/20",
  "📚": "from-violet-500/20 via-purple-500/10 to-indigo-600/20",
  "📝": "from-zinc-400/20 via-zinc-500/10 to-zinc-600/20"
};

export function formatCompact(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return String(value);
}

export function StatCard({ stat }: StatCardProps) {
  const gradient =
    gradientMap[stat.icon] ?? "from-zinc-400/20 via-zinc-500/10 to-zinc-600/20";

  return (
    <div
      className={`relative overflow-hidden rounded-[1.25rem] border border-white/10 bg-gradient-to-br ${gradient} p-4`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_60%)]" />
      <div className="relative z-0">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-400">
          {stat.icon} {stat.label}
        </p>
        <p className="mt-1.5 text-2xl font-black tracking-tight text-white">
          {formatCompact(stat.value)}
        </p>
        {stat.trend && (
          <p
            className={`mt-1 text-xs font-semibold ${
              stat.trend.direction === "up"
                ? "text-emerald-400"
                : stat.trend.direction === "down"
                  ? "text-red-400"
                  : "text-zinc-400"
            }`}
          >
            {stat.trend.direction === "up" ? "↑" : stat.trend.direction === "down" ? "↓" : "→"}{" "}
            {stat.trend.value}
          </p>
        )}
      </div>
    </div>
  );
}
