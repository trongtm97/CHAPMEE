import { EmptyState, SectionHeader } from "@/components/ui";
import { PendingStoryCard } from "@/components/admin/content/PendingStoryCard";
import type { PendingStory } from "@/lib/admin/getPendingContent";

type PendingStoriesQueueProps = {
  stories: PendingStory[];
};

export function PendingStoriesQueue({ stories }: PendingStoriesQueueProps) {
  return (
    <section className="space-y-3">
      <SectionHeader
        subtitle="Truyện cần được duyệt trước khi xuất hiện công khai."
        title="Truyện chờ duyệt"
      />
      {stories.length ? (
        <div className="space-y-3">
          {stories.map((story) => (
            <PendingStoryCard key={story.id} story={story} />
          ))}
        </div>
      ) : (
        <EmptyState
          description="Không có truyện nào đang chờ duyệt."
          title="Hàng đợi trống"
        />
      )}
    </section>
  );
}
