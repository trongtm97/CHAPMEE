import Link from "next/link";
import { Card } from "@/components/ui";
import type { CreatorProfile } from "@/lib/creator/getCreatorProfile";
import type { CreatorStudioStats } from "@/types/me-page";

type CreatorStudioCardProps = {
  creatorProfile: CreatorProfile | null;
  stats: CreatorStudioStats | null;
  showRevenue?: boolean;
  compact?: boolean;
};

function formatCount(value: number) {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}K`;
  }
  return `${value}`;
}

export function CreatorStudioCard({
  compact = false,
  creatorProfile,
  showRevenue = false,
  stats
}: CreatorStudioCardProps) {
  if (!creatorProfile) {
    return (
      <Card className="space-y-3 p-4">
        <div>
          <h2 className="text-base font-bold text-white">Bạn có câu chuyện muốn kể?</h2>
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            Đăng truyện đầu tiên và xây cộng đồng độc giả.
          </p>
        </div>
        <Link
          className="inline-flex min-h-9 items-center justify-center rounded-full bg-cyan-300 px-4 text-xs font-bold text-zinc-950 transition hover:bg-cyan-200"
          href="/studio/setup"
          >
          Bắt đầu viết
        </Link>
      </Card>
    );
  }

  const quickStats = [
    { label: "Truyện", value: stats?.stories ?? 0 },
    { label: "Lượt đọc", value: stats?.reads ?? 0 },
    { label: "Bình luận", value: stats?.comments ?? 0 }
  ];

  if (showRevenue && stats?.revenue != null) {
    quickStats.push({ label: "Doanh thu", value: stats.revenue });
  }

  return (
    <Card className={`space-y-3 ${compact ? "p-3.5" : "p-4"}`}>
      <div>
        <p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-cyan-200/90">
          ChapMee Studio
        </p>
        <h2 className="mt-0.5 text-base font-bold text-white">{creatorProfile.display_name}</h2>
        <p className="mt-1 text-xs leading-5 text-zinc-500">
          Quản lý truyện và chương của bạn
        </p>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {quickStats.slice(0, showRevenue ? 4 : 3).map((stat) => (
          <div
            className="rounded-lg border border-white/8 bg-white/[0.02] px-2 py-2 text-center"
            key={stat.label}
          >
            <p className="text-sm font-black text-white">
              {typeof stat.value === "number" ? formatCount(stat.value) : stat.value}
            </p>
            <p className="mt-0.5 text-[0.58rem] font-medium uppercase tracking-[0.06em] text-zinc-500">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Link
          className="inline-flex min-h-9 flex-1 items-center justify-center rounded-full bg-cyan-300 px-3 text-xs font-bold text-zinc-950 transition hover:bg-cyan-200"
          href="/studio"
        >
          Mở Studio
        </Link>
        <Link
          className="inline-flex min-h-9 flex-1 items-center justify-center rounded-full border border-white/12 bg-white/[0.03] px-3 text-xs font-semibold text-zinc-200 transition hover:border-cyan-300/25"
          href="/studio/stories/new"
        >
          Đăng truyện
        </Link>
      </div>
    </Card>
  );
}
