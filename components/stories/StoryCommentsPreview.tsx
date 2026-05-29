import { Card, EmptyState, SectionHeader } from "@/components/ui";
import type { StoryDetail } from "@/lib/stories/getStoryBySlug";

type StoryCommentsPreviewProps = {
  story: StoryDetail;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit"
  }).format(new Date(value));
}

export function StoryCommentsPreview({ story }: StoryCommentsPreviewProps) {
  return (
    <section className="space-y-3">
      <SectionHeader title="Bình luận mới" />
      {story.comments.length === 0 ? (
        <EmptyState
          description="Bình luận của độc giả sẽ xuất hiện tại đây."
          title="Chưa có bình luận"
        />
      ) : (
        <div className="space-y-3">
          {story.comments.map((comment) => (
            <Card className="space-y-2" key={comment.id}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-white">
                  {comment.displayName ?? "Độc giả ChapMee"}
                </p>
                <p className="text-xs text-zinc-500">
                  {formatDate(comment.createdAt)}
                </p>
              </div>
              <p className="text-sm leading-6 text-zinc-400">
                {comment.content}
              </p>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
