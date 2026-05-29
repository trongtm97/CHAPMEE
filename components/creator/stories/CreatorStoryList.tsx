import Link from "next/link";
import { EmptyState } from "@/components/ui";
import { CreatorStoryCard } from "@/components/creator/stories/CreatorStoryCard";
import type { CreatorStory } from "@/lib/creator/getCreatorStories";

type CreatorStoryListProps = {
  stories: CreatorStory[];
  basePath?: string;
};

export function CreatorStoryList({
  basePath = "/studio",
  stories
}: CreatorStoryListProps) {
  if (stories.length === 0) {
    return (
      <EmptyState
        action={
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-cyan-300 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-200"
            href={`${basePath}/stories/new`}
          >
            Tạo truyện mới
          </Link>
        }
        description="Khi bạn tạo truyện đầu tiên, danh sách quản lý sẽ xuất hiện ở đây."
        title="Chưa có truyện nào"
      />
    );
  }

  return (
    <div className="space-y-3">
      {stories.map((story) => (
        <CreatorStoryCard basePath={basePath} key={story.id} story={story} />
      ))}
    </div>
  );
}
