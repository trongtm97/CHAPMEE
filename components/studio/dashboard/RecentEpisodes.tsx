import Link from "next/link";
import { Badge, Card, EmptyState, SectionHeader } from "@/components/ui";
import type { StudioDashboardEpisode } from "@/lib/studio/getStudioDashboard";

type RecentEpisodesProps = {
  episodes: StudioDashboardEpisode[];
  basePath?: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(value));
}

export function RecentEpisodes({
  basePath = "/studio",
  episodes
}: RecentEpisodesProps) {
  return (
    <section className="space-y-3">
      <SectionHeader
        subtitle="Những chap vừa được chạm tới gần nhất."
        title="Chap gần đây"
      />

      {episodes.length ? (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
          <div className="hidden grid-cols-[minmax(0,1.3fr)_minmax(0,1.8fr)_8rem_10rem_8rem] gap-3 border-b border-white/10 px-4 py-3 text-xs font-bold uppercase tracking-[0.18em] text-zinc-500 md:grid">
            <span>Truyện</span>
            <span>Chap</span>
            <span>Trạng thái</span>
            <span>Cập nhật</span>
            <span>Hành động</span>
          </div>
          <div className="divide-y divide-white/10">
            {episodes.map((episode) => (
              <div
                className="grid gap-3 px-4 py-4 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1.8fr)_8rem_10rem_8rem] md:items-center"
                key={episode.id}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-sky-300">
                    {episode.storyTitle}
                  </p>
                  <p className="truncate text-xs text-zinc-500">
                    {episode.storySlug}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-white">
                    Chap {episode.episodeNumber}: {episode.title}
                  </p>
                </div>
                <Badge className="w-fit">{episode.status}</Badge>
                <p className="text-sm text-zinc-400">
                  {formatDate(episode.updatedAt)}
                </p>
                <Link
                  className="inline-flex min-h-11 items-center justify-center rounded-xl bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-100 transition hover:bg-white/10"
                  href={`${basePath}/stories/${episode.storyId}/episodes/${episode.id}/edit`}
                >
                  Sửa
                </Link>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <Card className="p-0">
          <EmptyState
            action={
              <Link
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-sky-300 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-200"
                href={`${basePath}/stories/new`}
              >
                Viết chap đầu tiên
              </Link>
            }
            description="Khi bạn tạo chap, danh sách chap gần đây sẽ xuất hiện ở đây."
            title="Chưa có chap nào"
          />
        </Card>
      )}
    </section>
  );
}
