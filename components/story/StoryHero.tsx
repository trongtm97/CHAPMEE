import Link from "next/link";
import { ChapMeeStoryCover } from "@/components/common/ChapMeeCover";
import { AuthorNameLink } from "@/components/profile/AuthorNameLink";
import { OriginalsBadge } from "@/components/story/OriginalsBadge";
import { StoryHeroDescription } from "@/components/story/StoryHeroDescription";
import { StoryOriginBadge } from "@/components/story/StoryOriginBadge";
import { formatReelsCount } from "@/lib/reels/formatCount";
import { getStoryCardMeta, isStandaloneStory } from "@/lib/stories/story-structure";
import type { StoryDetail } from "@/lib/stories/getStoryBySlug";

type StoryHeroProps = {
  story: StoryDetail;
  showOriginalsBadge: boolean;
  hasPublishedAudio?: boolean;
  hasPublishedFilms?: boolean;
};

function statusLabel(isCompleted: boolean) {
  return isCompleted ? "Hoàn thành" : "Đang ra";
}

export function StoryHero({
  showOriginalsBadge,
  story,
  hasPublishedAudio = false,
  hasPublishedFilms = false
}: StoryHeroProps) {
  const description =
    story.hook?.trim() ||
    story.shortDescription?.trim() ||
    story.longDescription?.trim() ||
    "";
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
    <section className="flex items-start gap-3.5 sm:gap-5 lg:gap-6">
      <ChapMeeStoryCover
        className="shrink-0 self-start border-0 shadow-none sm:w-28 md:w-32 lg:w-36"
        imgClassName="absolute inset-0 h-full w-full object-cover"
        priority
        showFallbackTitle={false}
        size="discoverSm"
        sizes="(max-width: 640px) 88px, (max-width: 1024px) 128px, 144px"
        story={{ title: story.title, coverUrl: story.coverUrl, currentImage: story.currentImage }}
        usage="storyHero"
      />

      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <OriginalsBadge show={showOriginalsBadge && story.originalsStatus === "original"} />
          <StoryOriginBadge
            contentOrigin={story.contentOrigin}
            rightsStatus={story.rightsStatus}
          />
          <span
            className={`rounded-full px-2.5 py-0.5 text-[0.68rem] font-bold uppercase tracking-wide ${
              story.isCompleted
                ? "bg-emerald-400/15 text-emerald-200"
                : "bg-amber-400/15 text-amber-100"
            }`}
          >
            {statusLabel(story.isCompleted)}
          </span>
          {hasPublishedAudio ? (
            <span className="rounded-full bg-cyan-300/15 px-2.5 py-0.5 text-[0.68rem] font-bold uppercase tracking-wide text-cyan-100">
              Có audio
            </span>
          ) : null}
          {hasPublishedFilms ? (
            <span className="rounded-full bg-rose-300/15 px-2.5 py-0.5 text-[0.68rem] font-bold uppercase tracking-wide text-rose-100">
              Có phim chuyển thể
            </span>
          ) : null}
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

        {description ? <StoryHeroDescription text={description} /> : null}
      </div>
    </section>
  );
}
