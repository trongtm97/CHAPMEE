import Link from "next/link";
import { SectionHeader } from "@/components/ui";
import { HomeEmptyState } from "@/components/home/HomeEmptyState";
import { StoryCard } from "@/components/home/StoryCard";
import type { HomeStory } from "@/lib/stories/getHomeStories";

type ForYouSectionProps = {
  stories: HomeStory[];
};

export function ForYouSection({ stories }: ForYouSectionProps) {
  return (
    <section className="space-y-3">
      <SectionHeader
        action={
          <Link
            className="text-xs font-bold uppercase tracking-[0.14em] text-cyan-200 transition hover:text-cyan-100"
            href="/discover"
          >
            Xem thêm
          </Link>
        }
        subtitle="Các truyện công khai đã duyệt hoặc đã xuất bản."
        title="Dành cho bạn"
      />
      {stories.length === 0 ? (
        <HomeEmptyState
          actionHref="/discover"
          actionLabel="Khám phá truyện"
          description="Khám phá thêm truyện để ChapMee gợi ý tốt hơn."
          title="Chưa có truyện để đề xuất"
        />
      ) : (
        <div className="space-y-3">
          {stories.map((story) => (
            <StoryCard key={story.id} story={story} />
          ))}
        </div>
      )}
    </section>
  );
}
