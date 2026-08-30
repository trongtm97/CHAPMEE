export type StudioDraftType = "story" | "chapter" | "reels" | "seo" | "template";

export type StudioDraftStatus = "draft" | "archived";

export type StudioDraftListFilter = "all" | StudioDraftType | "standalone_content";

import type { ChapterReelsPromoDraft } from "@/types/chapter-reels-promo";

export type ChapterDraftContent = {
  episodeNumber: number;
  title: string;
  content: string;
  excerpt: string;
  reelsPromo?: ChapterReelsPromoDraft;
  /** Studio Composer autosave */
  useComposerUi?: boolean;
  presentationSource?: string;
  composerDocument?: Record<string, unknown>;
  structuredContentJson?: string;
  presentationEditorMode?: string;
};

export type StoryDraftContent = {
  title: string;
  slug: string;
  hook: string;
  shortDescription: string;
  longDescription: string;
};

export type StudioDraftRecord = {
  id: string;
  ownerId: string;
  storyId: string | null;
  chapterId: string | null;
  draftType: StudioDraftType;
  title: string | null;
  content: Record<string, unknown>;
  plainText: string | null;
  status: StudioDraftStatus;
  lastSavedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type StudioDraftVersionRecord = {
  id: string;
  draftId: string;
  versionNumber: number;
  title: string | null;
  content: Record<string, unknown>;
  plainText: string | null;
  wordCount: number;
  createdAt: string;
};

export type StudioDraftListItem = {
  id: string;
  draftType: StudioDraftType;
  title: string;
  status: StudioDraftStatus;
  lastSavedAt: string;
  storyId: string | null;
  storyTitle: string | null;
  chapterId: string | null;
  chapterNumber: number | null;
  chapterTitle: string | null;
  resumeHref: string;
};

export type DraftAutosaveStatus = "saved" | "unsaved" | "error";

export type DraftDisplayStatus =
  | "writing"
  | "autosaved"
  | "missing_title"
  | "missing_content"
  | "not_ready"
  | "stale";

export type DraftStatusFilter =
  | "all"
  | "writing"
  | "incomplete"
  | "ready"
  | "has_errors"
  | "stale";

export type DraftTimeFilter =
  | "all"
  | "recent"
  | "today"
  | "7d"
  | "30d"
  | "older";

export type DraftSort =
  | "updated"
  | "updated_asc"
  | "title"
  | "type"
  | "priority";

export const DRAFT_LIST_PAGE_SIZES = [10, 25, 50] as const;
export type DraftListPageSize = (typeof DRAFT_LIST_PAGE_SIZES)[number];
export const DRAFT_LIST_PAGE_SIZE_DEFAULT: DraftListPageSize = 10;

/** Normalized draft for the drafts management page. */
export type DraftItem = {
  id: string;
  type: StudioDraftType;
  /** UI label when story draft is standalone content */
  structureLabel?: "chaptered" | "standalone" | null;
  title: string;
  subtitle: string;
  excerpt: string;
  parentStoryTitle: string | null;
  displayStatus: DraftDisplayStatus;
  updatedAt: string;
  wordCount: number;
  characterCount: number;
  chapterNumber: number | null;
  autosaveStatus: DraftAutosaveStatus;
  autosaveAt: string | null;
  missingFields: string[];
  editUrl: string;
  previewUrl: string | null;
  canPublish: boolean;
  canSchedule: boolean;
  isStale: boolean;
  storyId: string | null;
  chapterId: string | null;
  hasVersions: boolean;
};

export type StudioDraftStats = {
  total: number;
  story: number;
  chapter: number;
  standaloneContent: number;
  reels: number;
  seo: number;
  atRisk: number;
  stale: number;
};
