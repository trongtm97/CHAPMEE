import { TrackedStoryLink } from "@/components/tracking/TrackedStoryLink";
import { AuthorNameLink } from "@/components/profile/AuthorNameLink";
import { getStoryImageForUsage } from "@/lib/images/get-story-image";
import { getStoryPlaceholderInitial } from "@/lib/images/placeholders";
import { getStoryCardMeta } from "@/lib/stories/story-structure";
import { getStoryDetailHref } from "@/lib/stories/story-routes";
import type { StoryCatalogTrackingContext } from "@/types/story-catalog-tracking";
import type { StoryCatalogStory } from "@/types/story";

type MobileStoryListItemProps = {
  story: StoryCatalogStory;
  surface?: "category" | "search";
  position?: number;
  trackingContext?: StoryCatalogTrackingContext;
};

function compactNumber(value: number) {
  return new Intl.NumberFormat("vi-VN", { notation: "compact" }).format(value);
}

function formatUpdated(publishedAt: string | null) {
  if (!publishedAt) {
    return "Mới";
  }
  const date = new Date(publishedAt);
  return `${date.getDate()}/${date.getMonth() + 1}`;
}

export function MobileStoryListItem({
  story,
  surface = "category",
  position,
  trackingContext
}: MobileStoryListItemProps) {
  const excerpt = story.hook ?? story.shortDescription ?? "Một truyện ngắn đang chờ bạn khám phá.";
  const genre = story.genreName ?? "Khám phá";
  const cover = getStoryImageForUsage(story, "catalogRow");
  const href =
    story.href ?? getStoryDetailHref({ slug: story.slug, public_code: story.publicCode });
  const tagLine = (story.tagPreview ?? []).slice(0, 2).join(" · ");
  const cardMeta = getStoryCardMeta({
    structureType: story.structureType ?? "chaptered",
    standaloneReadingTimeMinutes: story.standaloneReadingTimeMinutes ?? 0,
    episodeCount: story.chapterCount ?? 0
  });
  const structureLine = cardMeta.secondaryLabel
    ? `${cardMeta.primaryLabel} · ${cardMeta.secondaryLabel}`
    : cardMeta.primaryLabel;

  return (
    <TrackedStoryLink
      className="tap-highlight block"
      href={href}
      position={position}
      storyId={story.id}
      surface={surface}
      trackingContext={trackingContext}
    >
      <article className="flex gap-3 rounded-xl border border-white/10 bg-[var(--surface-soft)] p-2.5 transition hover:border-cyan-300/25">
        <div className="relative aspect-video w-[7.25rem] shrink-0 overflow-hidden rounded-lg border border-white/10 bg-gradient-to-br from-cyan-300/30 via-sky-300/20 to-indigo-500/30">
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
            <span className="absolute inset-0 flex items-center justify-center text-xs font-black text-white/90">
              {getStoryPlaceholderInitial(story.title)}
            </span>
          )}
          <span className="absolute bottom-1 left-1 max-w-[calc(100%-0.5rem)] truncate rounded bg-black/45 px-1.5 py-0.5 text-[9px] font-semibold text-zinc-100">
            {genre}
          </span>
        </div>

        <div className="min-w-0 flex-1 py-0.5">
          <h3 className="line-clamp-2 break-words text-sm font-bold leading-5 text-zinc-50">{story.title}</h3>
          <p className="mt-0.5 flex min-w-0 items-center gap-1 truncate text-[11px] text-zinc-400">
            <AuthorNameLink
              className="min-w-0 truncate text-[11px] text-zinc-400"
              name={story.creatorName ?? "Tác giả ChapMee"}
              nameClassName="text-zinc-400"
              username={story.creatorUsername}
            />
            <span className="shrink-0 text-zinc-600">·</span>
            <span className="truncate">{genre}</span>
          </p>
          <p className="mt-1 line-clamp-1 text-[11px] leading-4 text-zinc-300">{excerpt}</p>
          <p className="mt-1 truncate text-[10px] text-zinc-500">
            {structureLine ? `${structureLine} · ` : ""}
            🔥 {compactNumber(Math.max(0, story.score))} · {story.isCompleted ? "Hoàn thành" : "Đang ra"} ·{" "}
            {formatUpdated(story.publishedAt)}
            {tagLine ? ` · ${tagLine}` : ""}
          </p>
          <span className="mt-1 inline-flex text-[11px] font-bold text-cyan-200">Đọc ngay →</span>
        </div>
      </article>
    </TrackedStoryLink>
  );
}
