import Link from "next/link";
import { Badge, Card, SectionHeader } from "@/components/ui";
import { StudioStatCard } from "@/components/studio/StudioStatCard";
import { RecentEpisodes } from "@/components/studio/dashboard/RecentEpisodes";
import { RecentStories } from "@/components/studio/dashboard/RecentStories";
import { StudioQuickActions } from "@/components/studio/dashboard/StudioQuickActions";
import type { StudioDashboardData } from "@/lib/studio/getStudioDashboard";

type StudioOverviewProps = {
  data: StudioDashboardData;
  basePath?: string;
};

function formatGreetingName(name: string) {
  return name.trim() || "Tác giả";
}

export function StudioOverview({ basePath = "/studio", data }: StudioOverviewProps) {
  const pendingChapters = data.stats.pendingEpisodes;
  const draftChapters = data.stats.draftEpisodes;

  return (
    <section className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-300">
                Tổng quan
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-normal text-white">
                Chào mừng, {formatGreetingName(data.creatorProfile.pen_name)}
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-zinc-400">
                Studio này giữ mọi thứ ở một nơi: truyện đang viết, chap chờ
                duyệt, và nhịp làm việc gần nhất của bạn.
              </p>
            </div>
            <Badge
              variant={
                data.creatorProfile.status === "active" ? "success" : "danger"
              }
            >
              {data.creatorProfile.status}
            </Badge>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <StudioStatCard label="Tổng truyện" value={data.stats.totalStories} />
            <StudioStatCard label="Tổng chap" value={data.stats.totalEpisodes} />
            <StudioStatCard label="Chap đang nháp" value={draftChapters} />
            <StudioStatCard label="Chap chờ duyệt" value={pendingChapters} />
            <StudioStatCard
              label="Truyện đã public"
              value={data.stats.publishedStories}
            />
            <StudioStatCard
              description="Số bình luận visible trong 7 ngày gần nhất."
              label="Bình luận mới"
              value={data.stats.recentComments}
            />
          </div>
        </Card>

        <Card className="space-y-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-300">
              Trạng thái nhanh
            </p>
            <h3 className="mt-2 text-lg font-bold text-white">
              Nhịp làm việc hiện tại
            </h3>
          </div>
          <div className="space-y-3">
            <QuickState
              label="Nháp"
              value={draftChapters}
              tone="text-zinc-100"
            />
            <QuickState
              label="Chờ duyệt"
              value={pendingChapters}
              tone="text-amber-200"
            />
            <QuickState
              label="Bình luận mới"
              value={data.stats.recentComments}
              tone="text-sky-200"
            />
          </div>
          <Link
            className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-sky-300 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-200"
            href={`${basePath}/stories/new`}
          >
            Tạo truyện mới
          </Link>
        </Card>
      </div>

      <section className="space-y-3">
        <SectionHeader title="Thao tác nhanh" />
        <StudioQuickActions basePath={basePath} />
      </section>

      <RecentStories basePath={basePath} stories={data.recentStories} />
      <RecentEpisodes basePath={basePath} episodes={data.recentEpisodes} />
    </section>
  );
}

function QuickState({
  label,
  tone,
  value
}: {
  label: string;
  tone: string;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <p className="text-sm font-medium text-zinc-400">{label}</p>
      <p className={`text-lg font-black tracking-normal ${tone}`}>{value}</p>
    </div>
  );
}
