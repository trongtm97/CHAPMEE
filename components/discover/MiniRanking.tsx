import Link from "next/link";
import { TrackedStoryLink } from "@/components/tracking/TrackedStoryLink";
import { DiscoverAuthorLine } from "@/components/discover/DiscoverAuthorLine";
import type { DiscoverStory } from "@/lib/discover/getDiscoverData";
import { getStoryDetailHref } from "@/lib/stories/story-routes";

type MiniRankingProps = {
  stories: DiscoverStory[];
};

function isRecentlyPublished(publishedAt: string | null) {
  if (!publishedAt) {
    return false;
  }
  const published = new Date(publishedAt).getTime();
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return published >= weekAgo;
}

export function MiniRanking({ stories }: MiniRankingProps) {
  const uniqueStories = stories.filter(
    (story, index, array) => array.findIndex((item) => item.id === story.id) === index
  );

  if (uniqueStories.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <h2 className="text-lg font-black text-white">Top truyện hôm nay</h2>
        <Link className="text-xs font-bold text-cyan-200" href="/bang-xep-hang">
          Xem bảng xếp hạng
        </Link>
      </div>

      <div className="space-y-1.5 rounded-2xl border border-white/10 bg-[var(--surface)] p-3">
        {uniqueStories.slice(0, 5).map((story, index) => (
          <TrackedStoryLink
            algorithmVersion={story.feed?.algorithmVersion}
            authorUserId={story.creatorUserId}
            candidatePool={story.feed?.candidatePool}
            className="flex items-center gap-3 rounded-xl px-2 py-1.5 transition hover:bg-white/[0.05]"
            href={getStoryDetailHref({
              slug: story.slug,
              public_code: story.publicCode
            })}
            key={story.id}
            position={index + 1}
            requestId={story.feed?.requestId}
            sectionKey={story.feed?.sectionKey ?? "ranking_today"}
            sourceSurface="discover"
            storyId={story.id}
            surface="ranking"
          >
            <span className="w-6 shrink-0 text-center text-sm font-black text-cyan-200">{index + 1}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-zinc-100">{story.title}</p>
              <DiscoverAuthorLine
                className="truncate text-xs text-zinc-400"
                creatorName={story.creatorName}
                creatorUsername={story.creatorUsername}
              />
            </div>
            {index === 0 ? (
              <span className="text-[10px] font-bold text-rose-300">HOT</span>
            ) : isRecentlyPublished(story.publishedAt) ? (
              <span className="text-[10px] font-bold text-emerald-300">NEW</span>
            ) : null}
          </TrackedStoryLink>
        ))}
      </div>
    </section>
  );
}
