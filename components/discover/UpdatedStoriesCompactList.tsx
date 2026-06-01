import Link from "next/link";
import { DiscoverAuthorLine } from "@/components/discover/DiscoverAuthorLine";
import type { DiscoverStory } from "@/lib/discover/getDiscoverData";
import { getStoryDetailHref } from "@/lib/stories/story-routes";

type UpdatedStoriesCompactListProps = {
  stories: DiscoverStory[];
};

function formatUpdated(publishedAt: string | null) {
  if (!publishedAt) {
    return "Mới";
  }
  const date = new Date(publishedAt);
  return `${date.getDate()}/${date.getMonth() + 1}`;
}

export function UpdatedStoriesCompactList({ stories }: UpdatedStoriesCompactListProps) {
  if (stories.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <h2 className="text-lg font-black text-white">Mới cập nhật</h2>
        <Link className="text-xs font-bold text-cyan-200" href="/truyen?sort=updated&page=1">
          Xem thêm
        </Link>
      </div>

      <ul className="space-y-1.5 rounded-2xl border border-white/10 bg-[var(--surface)] p-2">
        {stories.slice(0, 3).map((story) => (
          <li key={story.id}>
            <Link
              className="flex items-center gap-2.5 rounded-xl px-2 py-2 transition hover:bg-white/[0.04]"
              href={getStoryDetailHref({
                slug: story.slug,
                public_code: story.publicCode
              })}
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-gradient-to-br from-cyan-300/30 to-indigo-500/30 text-sm font-black text-white">
                {story.title.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-1 text-sm font-semibold text-zinc-100">{story.title}</p>
                <div className="mt-0.5 flex min-w-0 items-center gap-1 truncate text-[11px] text-zinc-400">
                  <DiscoverAuthorLine
                    className="min-w-0 truncate text-[11px] text-zinc-400"
                    creatorName={story.creatorName}
                    creatorUsername={story.creatorUsername}
                  />
                  <span className="shrink-0 text-zinc-600">·</span>
                  <span className="truncate">{story.genreName ?? "Truyện"}</span>
                </div>
              </div>
              <span className="shrink-0 text-[10px] font-semibold text-zinc-500">{formatUpdated(story.publishedAt)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
