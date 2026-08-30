import Link from "next/link";
import { ChapMeeStoryCover } from "@/components/common/ChapMeeCover";
import { getStoryCardMeta } from "@/lib/stories/story-structure";
import { getStoryDetailHref } from "@/lib/stories/story-routes";
import { StoryAudioBadge, type StoryAudioBadgeDisplay } from "@/src/components/story/StoryAudioBadge";
import type { PublicWorkItem } from "@/types/public-profile";

type ProfileStoryCardProps = {
  work: PublicWorkItem;
  audioBadgeDisplay?: StoryAudioBadgeDisplay;
};

function formatUpdatedAt(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("vi-VN", { day: "numeric", month: "short" });
}

export function ProfileStoryCard({ work, audioBadgeDisplay }: ProfileStoryCardProps) {
  const cardMeta = getStoryCardMeta({
    structureType: work.structureType,
    standaloneReadingTimeMinutes: work.standaloneReadingTimeMinutes,
    episodeCount: work.chapterCount
  });
  const updatedLabel = formatUpdatedAt(work.updatedAt);

  return (
    <Link
      className="group block overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition hover:border-cyan-300/30 hover:bg-white/[0.05]"
      href={getStoryDetailHref({ slug: work.slug, public_code: work.publicCode })}
    >
      <div className="flex gap-3 p-3 sm:gap-4 sm:p-4">
        <ChapMeeStoryCover
          className="rounded-xl sm:hidden"
          size="md"
          story={{ title: work.title, coverUrl: work.coverUrl }}
          usage="libraryCard"
        />
        <ChapMeeStoryCover
          className="hidden rounded-xl sm:block"
          size="lg"
          story={{ title: work.title, coverUrl: work.coverUrl }}
          usage="libraryCard"
        />

        <div className="min-w-0 flex-1 py-0.5">
          <div className="flex flex-wrap items-center gap-2">
            {work.genreName ? (
              <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-cyan-100">
                {work.genreName}
              </span>
            ) : null}
            <span className="text-[0.7rem] font-medium text-zinc-500">{work.statusLabel}</span>
            <StoryAudioBadge
              {...audioBadgeDisplay}
              hasContinuousPlayback={work.hasContinuousPlayback}
              hasPublishedAudio={work.hasPublishedAudio}
            />
          </div>

          <h3 className="mt-2 line-clamp-2 text-base font-black leading-snug text-white group-hover:text-cyan-50 sm:text-lg">
            {work.title}
          </h3>

          {work.description ? (
            <p className="mt-1.5 line-clamp-3 text-sm leading-6 text-zinc-400">{work.description}</p>
          ) : null}

          <p className="mt-2 text-xs text-zinc-500">
            {cardMeta.primaryLabel}
            {cardMeta.secondaryLabel ? ` · ${cardMeta.secondaryLabel}` : ""}
            {work.likeCountLabel ? ` · ${work.likeCountLabel}` : ""}
            {updatedLabel ? ` · Cập nhật ${updatedLabel}` : ""}
          </p>
        </div>
      </div>
    </Link>
  );
}
