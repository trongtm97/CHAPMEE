import type { SourceEntityType } from "@/lib/community-sync/constants";

const SOURCE_TYPE_LABELS: Record<string, string> = {
  chapter: "Chương",
  story: "Truyện",
  reel: "Reels",
  audio_episode: "Audio",
  adaptation_episode: "Phim chuyển thể",
  trailer: "Trailer",
  review: "Review",
  comment: "Bình luận"
};

export function getSourceTypeLabel(sourceEntityType: string) {
  return SOURCE_TYPE_LABELS[sourceEntityType] ?? "Hoạt động";
}

export function buildSourceOriginLabel(input: {
  sourceEntityType: string;
  sourceChapterOrder?: number | null;
  itemType: string;
}) {
  if (input.itemType === "aggregated_comments") {
    return input.sourceChapterOrder
      ? `Chương ${input.sourceChapterOrder}`
      : "Nhiều chương";
  }

  switch (input.sourceEntityType) {
    case "chapter":
      return input.sourceChapterOrder
        ? `Chương ${input.sourceChapterOrder}`
        : "Chương";
    case "reel":
      return input.sourceChapterOrder
        ? `Reels · Chương ${input.sourceChapterOrder}`
        : "Reels";
    case "audio_episode":
      return input.sourceChapterOrder
        ? `Audio · Chương ${input.sourceChapterOrder}`
        : "Audio";
    case "adaptation_episode":
      return "Phim chuyển thể";
    case "trailer":
      return "Trailer";
    case "review":
      return "Review truyện";
    default:
      return getSourceTypeLabel(input.sourceEntityType);
  }
}

export function parseAggregatedActivityMetadata(title: string | null | undefined) {
  if (!title) {
    return null;
  }

  try {
    const parsed = JSON.parse(title) as {
      count?: number;
      windowMinutes?: number;
      latestExcerpt?: string | null;
    };
    if (typeof parsed.count === "number") {
      return parsed;
    }
  } catch {
    return null;
  }

  return null;
}

export function buildAggregatedActivityTitle(input: {
  sourceChapterOrder?: number | null;
  excerpt?: string | null;
  collapseWindowMinutes?: number;
  title?: string | null;
}) {
  const metadata = parseAggregatedActivityMetadata(input.title);
  const chapter =
    input.sourceChapterOrder !== null && input.sourceChapterOrder !== undefined
      ? `Chương ${input.sourceChapterOrder}`
      : "Nguồn này";

  const count =
    metadata?.count ??
    input.excerpt?.match(/(\d+)\s+bình luận/)?.[1] ??
    "nhiều";
  const window = metadata?.windowMinutes ?? input.collapseWindowMinutes ?? 30;

  return `${chapter} có ${count} bình luận mới trong ${window} phút qua`;
}

export function isMediaSourceType(sourceEntityType: SourceEntityType | string) {
  return (
    sourceEntityType === "audio_episode" ||
    sourceEntityType === "adaptation_episode" ||
    sourceEntityType === "trailer" ||
    sourceEntityType === "reel"
  );
}
