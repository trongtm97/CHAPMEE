import Link from "next/link";
import { EmptyState } from "@/components/ui";
import { StudioChapterRow } from "@/components/studio/StudioChapterRow";
import { studioPath } from "@/lib/studio/constants";
import type { StudioChapter } from "@/lib/studio/get-studio-chapters";

type StudioChapterListProps = {
  chapters: StudioChapter[];
  storyId: string;
  storySlug: string;
  hasActiveFilters: boolean;
};

export function StudioChapterList({
  chapters,
  hasActiveFilters,
  storyId,
  storySlug
}: StudioChapterListProps) {
  if (chapters.length === 0) {
    if (hasActiveFilters) {
      return (
        <EmptyState
          description="Thử đổi từ khóa hoặc bộ lọc khác."
          title="Không có chương phù hợp"
        />
      );
    }

    return (
      <EmptyState
        action={
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-sky-300 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-200"
            href={studioPath(`/stories/${storyId}/chapters/new`)}
          >
            Viết chương đầu tiên
          </Link>
        }
        description="Hãy viết chương đầu tiên để bắt đầu hành trình của bạn."
        title="Truyện này chưa có chương."
      />
    );
  }

  return (
    <div className="space-y-3">
      {chapters.map((chapter) => (
        <StudioChapterRow
          chapter={chapter}
          key={chapter.id}
          storyId={storyId}
          storySlug={storySlug}
        />
      ))}
    </div>
  );
}
