import Link from "next/link";
import { AuthorNameLink } from "@/components/profile/AuthorNameLink";
import { OriginalsBadge } from "@/components/story/OriginalsBadge";
import { getStoryImage } from "@/lib/images/get-story-image";
import {
  STORY_IMAGE_PLACEHOLDER_GRADIENT_CLASS,
  getStoryPlaceholderInitial
} from "@/lib/images/placeholders";
import { formatReelsCount } from "@/lib/reels/formatCount";
import { getStoryCardMeta, isStandaloneStory } from "@/lib/stories/story-structure";
import type { StoryDetail } from "@/lib/stories/getStoryBySlug";

type StoryHeroProps = {
  story: StoryDetail;
  showOriginalsBadge: boolean;
};

function statusLabel(isCompleted: boolean) {
  return isCompleted ? "Hoàn thành" : "Đang ra";
}

export function StoryHero({ showOriginalsBadge, story }: StoryHeroProps) {
  const description =
    story.hook?.trim() ||
    story.shortDescription?.trim() ||
    story.longDescription?.trim() ||
    "";
  const cover = getStoryImage(
    { title: story.title, coverUrl: story.coverUrl, currentImage: story.currentImage },
    "portrait"
  );
  const cardMeta = getStoryCardMeta({
    structureType: story.structureType,
    standaloneReadingTimeMinutes: story.standaloneReadingTimeMinutes,
    episodeCount: story.episodeCount
  });
  const statsLine = isStandaloneStory(story)
    ? [
        cardMeta.secondaryLabel ?? cardMeta.primaryLabel,
        `${formatReelsCount(story.likeCount)} lượt thích`,
        `${formatReelsCount(story.saveCount)} lượt lưu`
      ].join(" · ")
    : `${story.episodeCount} chương · ${formatReelsCount(story.likeCount)} lượt thích · ${formatReelsCount(story.saveCount)} lượt lưu`;

  return (
    <section className="flex gap-3.5 sm:gap-4">
      <div className="relative h-[7.5rem] w-[5.25rem] shrink-0 overflow-hidden rounded-xl border border-white/10 bg-zinc-900 sm:h-32 sm:w-[5.75rem]">
        {cover.src ? (
          <div
            aria-label={cover.alt}
            className="h-full w-full bg-cover"
            role="img"
            style={{
              backgroundImage: `url(${cover.src})`,
              backgroundPosition: cover.objectPosition
            }}
          />
        ) : (
          <div
            className={`flex h-full items-center justify-center text-2xl font-black text-white ${STORY_IMAGE_PLACEHOLDER_GRADIENT_CLASS}`}
          >
            {getStoryPlaceholderInitial(story.title)}
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <OriginalsBadge show={showOriginalsBadge && story.originalsStatus === "original"} />
          <span
            className={`rounded-full px-2.5 py-0.5 text-[0.68rem] font-bold uppercase tracking-wide ${
              story.isCompleted
                ? "bg-emerald-400/15 text-emerald-200"
                : "bg-amber-400/15 text-amber-100"
            }`}
          >
            {statusLabel(story.isCompleted)}
          </span>
        </div>

        <h1 className="text-xl font-black leading-tight text-white sm:text-2xl">{story.title}</h1>

        <p className="text-sm font-semibold text-zinc-300">
          Tác giả:{" "}
          <AuthorNameLink
            badge={story.authorVerification}
            className="text-cyan-100"
            name={story.creatorName ?? "ChapMee"}
            nameClassName="text-cyan-100"
            username={story.creatorUsername}
          />
        </p>

        <div className="flex flex-wrap gap-1.5">
          {story.genreName ? (
            story.genreSlug ? (
              <Link
                className="rounded-full bg-white/[0.06] px-2 py-0.5 text-xs text-cyan-200/90 transition hover:bg-white/10"
                href={`/the-loai/${story.genreSlug}`}
              >
                {story.genreName}
              </Link>
            ) : (
              <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-xs text-zinc-300">
                {story.genreName}
              </span>
            )
          ) : null}
          {story.tags.slice(0, 3).map((tag) => (
            <span
              className="rounded-full bg-white/[0.06] px-2 py-0.5 text-xs text-zinc-400"
              key={tag}
            >
              {tag}
            </span>
          ))}
        </div>

        <p className="text-xs text-zinc-500">{statsLine}</p>

        {description ? (
          <p className="line-clamp-3 text-sm leading-6 text-zinc-400">{description}</p>
        ) : null}
      </div>
    </section>
  );
}
