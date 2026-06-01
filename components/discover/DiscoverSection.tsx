import { DiscoverStoryCard } from "@/components/discover/DiscoverStoryCard";
import { Card, SectionHeader } from "@/components/ui";
import type { DiscoverStory } from "@/lib/discover/getDiscoverData";
import type { TrackingSurface } from "@/types/tracking";

type DiscoverSectionProps = {
  title: string;
  subtitle?: string;
  stories: DiscoverStory[];
  trackingSurface?: TrackingSurface;
};

export function DiscoverSection({
  stories,
  subtitle,
  title,
  trackingSurface = "discover"
}: DiscoverSectionProps) {
  return (
    <section className="space-y-3">
      <SectionHeader subtitle={subtitle} title={title} />
      {stories.length === 0 ? (
        <Card className="border-white/8 bg-white/[0.035] p-4">
          <div className="flex items-start gap-3">
            <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-cyan-300/15 bg-cyan-300/10 text-cyan-200">
              <span aria-hidden="true" className="block h-2.5 w-2.5 rounded-full bg-current" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-white">
                Không có truyện phù hợp
              </h3>
              <p className="mt-1 text-sm leading-6 text-zinc-400">
                Thử đổi từ khóa hoặc thể loại khác để xem thêm truyện.
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {stories.map((story, index) => (
            <DiscoverStoryCard
              key={story.id}
              position={index}
              story={story}
              surface={trackingSurface}
            />
          ))}
        </div>
      )}
    </section>
  );
}
