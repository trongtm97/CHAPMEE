import Link from "next/link";
import { Badge, Card, EmptyState, SectionHeader } from "@/components/ui";
import type { CreatorDashboardStory } from "@/lib/creator/getCreatorDashboard";

type CreatorStoriesPreviewProps = {
  stories: CreatorDashboardStory[];
};

function formatDate(value: string | null) {
  if (!value) {
    return "Chưa xuất bản";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(value));
}

export function CreatorStoriesPreview({ stories }: CreatorStoriesPreviewProps) {
  return (
    <section className="space-y-3" id="my-stories">
      <SectionHeader
        subtitle="Danh sách rút gọn để kiểm tra dữ liệu creator trong MVP."
        title="Truyện của bạn"
      />
      {stories.length ? (
        <div className="space-y-3">
          {stories.map((story) => (
            <Link href={`/stories/${story.slug}`} key={story.id}>
              <Card className="space-y-3 transition hover:border-cyan-300/60 hover:bg-zinc-800">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-white">
                      {story.title}
                    </h2>
                    <p className="mt-1 text-sm text-zinc-400">
                      Cập nhật {formatDate(story.updated_at)}
                    </p>
                  </div>
                  <Badge>{story.status}</Badge>
                </div>
                <p className="text-sm text-zinc-500">
                  Xuất bản: {formatDate(story.published_at)}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          description="Khi bạn tạo truyện đầu tiên, danh sách quản lý sẽ xuất hiện ở đây."
          title="Chưa có truyện nào"
        />
      )}
    </section>
  );
}
