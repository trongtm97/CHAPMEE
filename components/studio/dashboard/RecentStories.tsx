import Link from "next/link";
import { Badge, Card, EmptyState, SectionHeader } from "@/components/ui";
import type { StudioDashboardStory } from "@/lib/studio/getStudioDashboard";

type RecentStoriesProps = {
  stories: StudioDashboardStory[];
  basePath?: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(value));
}

function storyActionHref(basePath: string, storyId: string) {
  return `${basePath}/stories/${storyId}/edit`;
}

export function RecentStories({ basePath = "/studio", stories }: RecentStoriesProps) {
  return (
    <section className="space-y-3">
      <SectionHeader
        subtitle="Những truyện được chỉnh sửa gần nhất."
        title="Truyện gần đây"
      />

      {stories.length ? (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
          <div className="hidden grid-cols-[minmax(0,1.8fr)_8rem_10rem_6rem_10rem] gap-3 border-b border-white/10 px-4 py-3 text-xs font-bold uppercase tracking-[0.18em] text-zinc-500 md:grid">
            <span>Truyện</span>
            <span>Trạng thái</span>
            <span>Cập nhật</span>
            <span>Chap</span>
            <span>Hành động</span>
          </div>
          <div className="divide-y divide-white/10">
            {stories.map((story) => (
              <div
                className="grid gap-3 px-4 py-4 md:grid-cols-[minmax(0,1.8fr)_8rem_10rem_6rem_10rem] md:items-center"
                key={story.id}
              >
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-white">
                    {story.title}
                  </p>
                  <p className="mt-1 truncate text-sm text-zinc-500">
                    {story.slug}
                  </p>
                </div>
                <Badge className="w-fit">{story.status}</Badge>
                <p className="text-sm text-zinc-400">
                  {formatDate(story.updatedAt)}
                </p>
                <p className="text-sm font-semibold text-zinc-200">
                  {story.episodeCount}
                </p>
                <Link
                  className="inline-flex min-h-11 items-center justify-center rounded-xl bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-100 transition hover:bg-white/10"
                  href={storyActionHref(basePath, story.id)}
                >
                  Tiếp tục sửa
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
                Tạo truyện đầu tiên
              </Link>
            }
            description="Khi bạn có truyện đầu tiên, các bản sửa gần đây sẽ xuất hiện ở đây."
            title="Chưa có truyện nào"
          />
        </Card>
      )}
    </section>
  );
}
