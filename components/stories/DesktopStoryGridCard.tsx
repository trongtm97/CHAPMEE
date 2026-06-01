import { TrackedStoryLink } from "@/components/tracking/TrackedStoryLink";
import { AuthorNameLink } from "@/components/profile/AuthorNameLink";
import { getStoryImageForUsage } from "@/lib/images/get-story-image";
import { getStoryPlaceholderInitial } from "@/lib/images/placeholders";
import { getStoryDetailHref } from "@/lib/stories/story-routes";
import type { StoryCatalogTrackingContext } from "@/types/story-catalog-tracking";
import type { StoryCatalogStory } from "@/types/story";

type DesktopStoryGridCardProps = {
  story: StoryCatalogStory;
  surface?: "category" | "search";
  position?: number;
  trackingContext?: StoryCatalogTrackingContext;
};

function compactNumber(value: number) {
  return new Intl.NumberFormat("vi-VN", { notation: "compact" }).format(value);
}

export function DesktopStoryGridCard({
  story,
  surface = "category",
  position,
  trackingContext
}: DesktopStoryGridCardProps) {
  const excerpt = story.hook ?? story.shortDescription ?? "Một truyện ngắn đang chờ bạn khám phá.";
  const cover = getStoryImageForUsage(story, "catalogGrid");

  return (
    <TrackedStoryLink
      className="tap-highlight block h-full"
      href={story.href ?? getStoryDetailHref({ slug: story.slug, public_code: story.publicCode })}
      position={position}
      storyId={story.id}
      surface={surface}
      trackingContext={trackingContext}
    >
      <article className="flex h-full flex-col rounded-2xl border border-white/10 bg-[var(--surface-soft)] p-3 transition hover:border-cyan-300/30">
        <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-cyan-300/30 via-sky-300/20 to-indigo-500/30">
          {cover.src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt={cover.alt}
              className="h-full w-full object-cover"
              loading="lazy"
              src={cover.src}
              style={{ objectPosition: cover.objectPosition }}
            />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center text-sm font-black text-white/85">
              {getStoryPlaceholderInitial(story.title)}
            </span>
          )}
          <span className="absolute right-2 top-2 rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-zinc-100">
            {story.genreName ?? "Khám phá"}
          </span>
        </div>

        <div className="mt-2 min-w-0 flex-1">
          <h3 className="line-clamp-2 text-sm font-black leading-5 text-zinc-50">{story.title}</h3>
          <AuthorNameLink
            className="mt-1 block truncate text-xs text-zinc-400"
            name={story.creatorName ?? "Tác giả ChapMee"}
            nameClassName="text-zinc-400"
            username={story.creatorUsername}
          />
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-300">{excerpt}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-400">
            <span>{story.isCompleted ? "Hoàn thành" : "Đang ra"}</span>
            <span>•</span>
            <span>🔥 {compactNumber(Math.max(0, story.score))}</span>
          </div>
          <span className="mt-2 inline-flex text-xs font-bold text-cyan-200">Đọc ngay →</span>
        </div>
      </article>
    </TrackedStoryLink>
  );
}
