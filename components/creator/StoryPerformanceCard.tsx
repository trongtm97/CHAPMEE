import Link from "next/link";
import { Card } from "@/components/ui";
import { formatCompact } from "@/components/creator/StatCard";
import { getStoryCardMeta } from "@/lib/stories/story-structure";
import type { StoryDashboardItem } from "@/lib/creator/getCreatorDashboardData";

type StoryPerformanceCardProps = {
  story: StoryDashboardItem;
};

const statusColors: Record<string, string> = {
  published: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
  approved: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
  pending: "border-amber-400/25 bg-amber-400/10 text-amber-300",
  draft: "border-zinc-400/25 bg-zinc-400/10 text-zinc-300"
};

const statusLabels: Record<string, string> = {
  published: "Đã xuất bản",
  approved: "Public",
  pending: "Chờ duyệt",
  draft: "Nháp"
};

export function StoryPerformanceCard({ story }: StoryPerformanceCardProps) {
  const statusColor = statusColors[story.status] ?? statusColors.draft;
  const statusLabel = statusLabels[story.status] ?? story.status;
  const structureMeta = getStoryCardMeta({
    structureType: story.structureType,
    episodeCount: story.episodeCount
  });
  const structureMetricLabel = structureMeta.isStandalone ? "Dạng" : "Chap";
  const structureMetricValue = structureMeta.isStandalone
    ? "1 phần"
    : String(story.episodeCount);

  return (
    <Card className="space-y-3 transition hover:-translate-y-0.5 hover:border-cyan-300/30 hover:bg-[var(--surface-soft)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            className="text-base font-black tracking-normal text-white hover:text-cyan-200"
            href={`/stories/${story.slug}`}
          >
            {story.title}
          </Link>
          {story.hook && (
            <p className="mt-0.5 line-clamp-1 text-sm text-zinc-400">
              {story.hook}
            </p>
          )}
        </div>
        <span
          className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-[0.62rem] font-bold uppercase tracking-[0.14em] ${statusColor}`}
        >
          {statusLabel}
        </span>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <Metric label="Đọc" value={formatCompact(story.reads)} />
        <Metric label="Thích" value={formatCompact(story.likes)} />
        <Metric label="Bình luận" value={formatCompact(story.comments)} />
        <Metric label="Lưu" value={formatCompact(story.saves)} />
        <Metric label={structureMetricLabel} value={structureMetricValue} />
      </div>

      <div className="flex gap-2">
        <Link
          className="tap-highlight inline-flex min-h-9 items-center justify-center rounded-full bg-cyan-300 px-3.5 text-[0.7rem] font-black uppercase tracking-[0.12em] text-zinc-950 transition hover:bg-cyan-200"
          href={`/stories/${story.slug}`}
        >
          Xem truyện
        </Link>
        <Link
          className="tap-highlight inline-flex min-h-9 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] px-3.5 text-[0.7rem] font-black uppercase tracking-[0.12em] text-zinc-300 transition hover:border-white/25 hover:text-white"
          href={`/stories/${story.slug}`}
        >
          Viết tiếp
        </Link>
      </div>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex items-baseline gap-1">
      <span className="font-bold text-white">{value}</span>
      <span className="text-xs text-zinc-500">{label}</span>
    </span>
  );
}
