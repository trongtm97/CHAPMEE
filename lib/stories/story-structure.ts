import type {
  StoryCardMeta,
  StoryContentFormat,
  StoryStructureFields,
  StoryStructureType
} from "@/types/story-structure";

export const STORY_STRUCTURE_TYPES = ["chaptered", "standalone"] as const;

export const DEFAULT_STORY_STRUCTURE_TYPE: StoryStructureType = "chaptered";

export function normalizeStoryStructureType(
  value: string | null | undefined
): StoryStructureType {
  return value === "standalone" ? "standalone" : "chaptered";
}

export function isChapteredStory(
  story: Pick<StoryStructureFields, "structureType">
): boolean {
  return story.structureType !== "standalone";
}

export function isStandaloneStory(
  story: Pick<StoryStructureFields, "structureType">
): boolean {
  return story.structureType === "standalone";
}

export function getStoryContentModeLabel(
  story: Pick<StoryStructureFields, "structureType">
): string {
  return isStandaloneStory(story) ? "Truyện một phần" : "Truyện nhiều chương";
}

export function getStudioWriteActionLabel(
  structureType: StoryStructureType
): string {
  return isStandaloneStory({ structureType })
    ? "Soạn nội dung"
    : "Viết chương mới";
}

export function getStudioWriteToolLabel(
  structureType: StoryStructureType
): string {
  return isStandaloneStory({ structureType }) ? "Soạn nội dung" : "Viết chương";
}

export function getStoryReadingLabel(
  story: Pick<StoryStructureFields, "structureType" | "standaloneReadingTimeMinutes">
): string {
  if (isStandaloneStory(story)) {
    const minutes = story.standaloneReadingTimeMinutes;
    if (minutes > 0) {
      return `Đọc xong trong ${minutes} phút`;
    }
    return "Truyện một phần";
  }
  return "Truyện nhiều chương";
}

export function hasStandaloneContent(
  story: Pick<
    StoryStructureFields,
    "standaloneContentJson" | "standalonePlainText"
  >
): boolean {
  if (story.standalonePlainText?.trim()) {
    return true;
  }
  if (!story.standaloneContentJson) {
    return false;
  }
  if (typeof story.standaloneContentJson === "object") {
    const doc = story.standaloneContentJson as { blocks?: unknown[] };
    return Array.isArray(doc.blocks) && doc.blocks.length > 0;
  }
  return false;
}

export function mapStoryStructureFromRow(row: {
  structure_type?: string | null;
  content_format?: string | null;
  standalone_content_json?: unknown | null;
  standalone_plain_text?: string | null;
  standalone_word_count?: number | null;
  standalone_reading_time_minutes?: number | null;
  standalone_published_at?: string | null;
  standalone_updated_at?: string | null;
}): StoryStructureFields {
  return {
    structureType: normalizeStoryStructureType(row.structure_type),
    contentFormat: (row.content_format as StoryContentFormat | null) ?? null,
    standaloneContentJson: row.standalone_content_json ?? null,
    standalonePlainText: row.standalone_plain_text ?? null,
    standaloneWordCount: row.standalone_word_count ?? 0,
    standaloneReadingTimeMinutes: row.standalone_reading_time_minutes ?? 0,
    standalonePublishedAt: row.standalone_published_at ?? null,
    standaloneUpdatedAt: row.standalone_updated_at ?? null
  };
}

export function getStoryCardMeta(
  story: {
    structureType: StoryStructureType;
    standaloneReadingTimeMinutes?: number;
    episodeCount?: number;
    latestEpisodeNumber?: number | null;
    progressEpisodeNumber?: number | null;
  }
): StoryCardMeta {
  if (isStandaloneStory(story)) {
    const minutes = story.standaloneReadingTimeMinutes ?? 0;
    const readingLabel =
      minutes > 0 ? `Đọc xong trong ${minutes} phút` : null;

    return {
      primaryLabel: "Truyện một phần",
      secondaryLabel: readingLabel,
      ctaLabel: "Đọc ngay",
      progressLabel: null,
      isStandalone: true
    };
  }

  const count = story.episodeCount ?? 0;
  const chapterLabel =
    count > 0 ? `${count} chương` : count === 0 ? "Chưa có chương" : "";

  let progressLabel: string | null = null;
  if (story.progressEpisodeNumber) {
    progressLabel = `Đọc tiếp chương ${story.progressEpisodeNumber}`;
  }

  return {
    primaryLabel: chapterLabel,
    secondaryLabel: null,
    ctaLabel: story.progressEpisodeNumber ? "Đọc tiếp" : "Đọc chương đầu",
    progressLabel,
    isStandalone: false
  };
}

export function canChangeStoryStructure(
  story: StoryStructureFields & {
    status?: string | null;
    episodeCount?: number;
  }
): boolean {
  if (story.status === "published" || story.status === "approved") {
    return false;
  }
  if (isStandaloneStory(story) && hasStandaloneContent(story)) {
    return false;
  }
  if (isChapteredStory(story) && (story.episodeCount ?? 0) > 0) {
    return false;
  }
  return true;
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) {
    return 0;
  }
  return trimmed.split(/\s+/).filter(Boolean).length;
}

export function estimateReadingTimeMinutes(wordCount: number): number {
  if (wordCount <= 0) {
    return 0;
  }
  return Math.max(1, Math.ceil(wordCount / 200));
}
