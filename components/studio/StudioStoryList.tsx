import Link from "next/link";
import { EmptyState } from "@/components/ui";
import { StudioStoryCard } from "@/components/studio/StudioStoryCard";
import { studioPath } from "@/lib/studio/constants";
import type { StudioStory } from "@/lib/studio/get-studio-stories";

type StudioStoryListProps = {
  stories: StudioStory[];
  hasActiveFilters: boolean;
};

export function StudioStoryList({ hasActiveFilters, stories }: StudioStoryListProps) {
  if (stories.length === 0) {
    if (hasActiveFilters) {
      return (
        <EmptyState
          description="Thử đổi từ khóa hoặc bộ lọc khác."
          title="Không có truyện phù hợp"
        />
      );
    }

    return (
      <EmptyState
        action={
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-sky-300 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-200"
            href={studioPath("/stories/new")}
          >
            Tạo truyện đầu tiên
          </Link>
        }
        description="Bắt đầu tạo truyện đầu tiên trên ChapMee Studio."
        title="Bạn chưa có truyện nào."
      />
    );
  }

  return (
    <div className="space-y-3">
      {stories.map((story) => (
        <StudioStoryCard key={story.id} story={story} />
      ))}
    </div>
  );
}
