import { isStandaloneStory, normalizeStoryStructureType } from "@/lib/stories/story-structure";
import { studioPath } from "@/lib/studio/constants";
import { countWords } from "@/lib/text/countWords";
import type {
  DraftDisplayStatus,
  DraftItem,
  StudioDraftType
} from "@/types/drafts";

const STALE_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

type DraftRow = {
  id: string;
  draft_type: StudioDraftType;
  title: string | null;
  status: "draft" | "archived";
  last_saved_at: string;
  story_id: string | null;
  chapter_id: string | null;
  plain_text: string | null;
  stories: { title: string; structure_type?: string | null } | { title: string; structure_type?: string | null }[] | null;
  episodes:
    | { title: string; episode_number: number }
    | { title: string; episode_number: number }[]
    | null;
};

function firstRelation<T>(relation: T | T[] | null | undefined) {
  return Array.isArray(relation) ? (relation[0] ?? null) : (relation ?? null);
}

function resumeHref(row: DraftRow) {
  const story = firstRelation(row.stories);
  const isStandaloneStoryDraft =
    row.draft_type === "story" &&
    isStandaloneStory({ structureType: normalizeStoryStructureType(story?.structure_type) });

  if (isStandaloneStoryDraft && row.story_id) {
    return studioPath(`/stories/${row.story_id}/content`);
  }

  if (row.draft_type === "story" && row.story_id) {
    return studioPath(`/stories/${row.story_id}/edit`);
  }

  if (row.draft_type === "chapter" && row.story_id && row.chapter_id) {
    return studioPath(`/stories/${row.story_id}/chapters/${row.chapter_id}/edit`);
  }

  if (row.draft_type === "chapter" && row.story_id) {
    return studioPath(`/stories/${row.story_id}/chapters/new`);
  }

  if (row.draft_type === "reels") {
    return studioPath("/reels/new");
  }

  if (row.draft_type === "seo" && row.story_id) {
    return studioPath(`/stories/${row.story_id}/edit`);
  }

  return studioPath("/stories");
}

function previewHref(row: DraftRow) {
  if (row.draft_type === "chapter" && row.story_id && row.chapter_id) {
    return studioPath(
      `/stories/${row.story_id}/episodes/${row.chapter_id}/preview`
    );
  }

  if (row.draft_type === "story" && row.story_id) {
    return studioPath(`/stories/${row.story_id}/edit`);
  }

  if (row.draft_type === "reels") {
    return null;
  }

  return null;
}

function displayTitle(row: DraftRow) {
  if (row.title?.trim()) {
    return row.title.trim();
  }

  const story = firstRelation(row.stories);
  const episode = firstRelation(row.episodes);

  if (episode?.title) {
    return episode.title;
  }

  if (story?.title) {
    return story.title;
  }

  return "Nháp không tiêu đề";
}

function buildExcerpt(plainText: string | null) {
  const text = (plainText ?? "").replace(/\s+/g, " ").trim();

  if (!text) {
    return "";
  }

  return text.length > 120 ? `${text.slice(0, 117)}…` : text;
}

function computeDisplayStatus(
  row: DraftRow,
  missingFields: string[],
  isStale: boolean
): DraftDisplayStatus {
  if (isStale) {
    return "stale";
  }

  if (missingFields.includes("title")) {
    return "missing_title";
  }

  if (missingFields.includes("content")) {
    return "missing_content";
  }

  if (missingFields.length > 0) {
    return "not_ready";
  }

  return "autosaved";
}

function isStandaloneStoryDraftRow(row: DraftRow) {
  const story = firstRelation(row.stories);
  return (
    row.draft_type === "story" &&
    isStandaloneStory({ structureType: normalizeStoryStructureType(story?.structure_type) })
  );
}

function computeMissingFields(row: DraftRow, wordCount: number) {
  const missing: string[] = [];
  const hasTitle = Boolean(row.title?.trim()) || Boolean(firstRelation(row.episodes)?.title);
  const standaloneDraft = isStandaloneStoryDraftRow(row);

  if (!hasTitle) {
    missing.push("title");
  }

  if (row.draft_type === "chapter" || row.draft_type === "reels") {
    if (wordCount < 1) {
      missing.push("content");
    }
  }

  if (standaloneDraft && wordCount < 1) {
    missing.push("content");
  }

  return missing;
}

export function isDraftStale(lastSavedAt: string, now = Date.now()) {
  const saved = new Date(lastSavedAt).getTime();
  return now - saved > STALE_DAYS * MS_PER_DAY;
}

export function mapDraftRowToItem(
  row: DraftRow,
  hasVersions = false
): DraftItem {
  const story = firstRelation(row.stories);
  const episode = firstRelation(row.episodes);
  const standaloneDraft = isStandaloneStoryDraftRow(row);
  const plainText = row.plain_text ?? "";
  const wordCount = countWords(plainText);
  const characterCount = plainText.length;
  const missingFields = computeMissingFields(row, wordCount);
  const stale = isDraftStale(row.last_saved_at);
  const canPublish =
    missingFields.length === 0 &&
    row.draft_type !== "template" &&
    row.draft_type !== "seo";

  let subtitle = "—";

  if (row.draft_type === "chapter") {
    if (story?.title && episode?.episode_number) {
      subtitle = `${story.title} · Chương ${episode.episode_number}`;
    } else if (story?.title) {
      subtitle = story.title;
    }
  } else if (standaloneDraft) {
    subtitle = story?.title ? `${story.title} · Nội dung một phần` : "Nội dung một phần";
  } else if (story?.title) {
    subtitle = story.title;
  }

  return {
    autosaveAt: row.last_saved_at,
    autosaveStatus: "saved",
    canPublish,
    canSchedule: canPublish && Boolean(row.story_id),
    chapterId: row.chapter_id,
    chapterNumber: episode?.episode_number ?? null,
    characterCount,
    displayStatus: computeDisplayStatus(row, missingFields, stale),
    editUrl: resumeHref(row),
    excerpt: buildExcerpt(row.plain_text),
    hasVersions,
    id: row.id,
    isStale: stale,
    missingFields,
    parentStoryTitle: story?.title ?? null,
    previewUrl: previewHref(row),
    storyId: row.story_id,
    structureLabel: standaloneDraft ? "standalone" : row.draft_type === "story" ? "chaptered" : null,
    subtitle,
    title: displayTitle(row),
    type: row.draft_type,
    updatedAt: row.last_saved_at,
    wordCount
  };
}

export function estimateReadMinutes(wordCount: number) {
  if (wordCount <= 0) {
    return 0;
  }

  return Math.max(1, Math.ceil(wordCount / 200));
}
