import { getStoryCardMeta } from "@/lib/stories/story-structure";
import { getLegacyStoryPath, getStoryUrl } from "@/lib/urls/paths";
import type { StoryCatalogStory } from "@/types/story";

function buildCatalogStoryHref(story: StoryCatalogStory): string {
  const publicCode = story.publicCode?.trim();
  if (publicCode) {
    return getStoryUrl({ slug: story.slug, public_code: publicCode });
  }
  return getLegacyStoryPath(story.slug);
}

export type StoryCatalogCardView = {
  href: string;
  title: string;
  authorDisplayName: string;
  authorUsername: string | null;
  genreLabel: string | null;
  statusLabel: string;
  description: string;
  statsLine: string;
  ctaLabel: string;
  hasAudio: boolean;
  hasContinuousPlayback: boolean;
  hasVideo: boolean;
  contentOrigin: StoryCatalogStory["contentOrigin"];
  rightsStatus: string | null;
};

function compactNumber(value: number) {
  return new Intl.NumberFormat("vi-VN", { notation: "compact" }).format(value);
}

function formatUpdated(publishedAt: string | null) {
  if (!publishedAt) return "Mới";
  const date = new Date(publishedAt);
  if (Number.isNaN(date.getTime())) return "Mới";
  return date.toLocaleDateString("vi-VN", { day: "numeric", month: "short" });
}

/** Normalize catalog card fields from a story row — no demo data. */
export function buildStoryCatalogCardView(story: StoryCatalogStory): StoryCatalogCardView {
  const cardMeta = getStoryCardMeta({
    structureType: story.structureType ?? "chaptered",
    standaloneReadingTimeMinutes: story.standaloneReadingTimeMinutes ?? 0,
    episodeCount: story.chapterCount ?? 0
  });

  const statsLine = [cardMeta.primaryLabel, `🔥 ${compactNumber(Math.max(0, story.score))}`, formatUpdated(story.publishedAt)]
    .filter(Boolean)
    .join(" · ");

  return {
    href: story.href ?? buildCatalogStoryHref(story),
    title: story.title,
    authorDisplayName: story.creatorName ?? "Tác giả ChapMee",
    authorUsername: story.creatorUsername,
    genreLabel: story.genreName,
    statusLabel: story.isCompleted ? "Hoàn thành" : "Đang ra",
    description:
      story.hook?.trim() ||
      story.shortDescription?.trim() ||
      "Một câu chuyện đang chờ bạn khám phá.",
    statsLine,
    ctaLabel: story.contentOrigin === "translation" ? "Đọc miễn phí →" : "Đọc ngay →",
    hasAudio: Boolean(story.hasPublishedAudio),
    hasContinuousPlayback: Boolean(story.hasContinuousPlayback),
    hasVideo: Boolean(story.hasPublishedVideo),
    contentOrigin: story.contentOrigin,
    rightsStatus: story.rightsStatus ?? null
  };
}
