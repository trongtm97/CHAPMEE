import Link from "next/link";
import { SectionHeader } from "@/components/ui";
import { HomeEmptyState } from "@/components/home/HomeEmptyState";
import { TrendingStoryCard } from "@/components/home/TrendingStoryCard";
import type { HomeStory } from "@/lib/stories/getHomeStories";

type TrendingSectionProps = {
  stories: HomeStory[];
};

export function TrendingSection({ stories }: TrendingSectionProps) {
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
        subtitle="Tạm xếp hạng theo tín hiệu đọc, lưu và bình luận gần đây."
        title="Trending 24h"
      />
      {stories.length === 0 ? (
        <HomeEmptyState
          description="Khám phá thêm truyện để ChapMee gợi ý tốt hơn."
          title="Chưa có xu hướng"
        />
      ) : (
        <div className="space-y-3">
          {stories.map((story, index) => (
            <TrendingStoryCard key={story.id} rank={index + 1} story={story} />
          ))}
        </div>
      )}
    </section>
  );
}
