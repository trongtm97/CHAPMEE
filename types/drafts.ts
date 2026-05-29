export type StudioDraftType = "story" | "chapter" | "swipe" | "seo" | "template";

export type StudioDraftStatus = "draft" | "archived";

export type StudioDraftListFilter = "all" | StudioDraftType;

export type ChapterDraftContent = {
  episodeNumber: number;
  title: string;
  content: string;
  excerpt: string;
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
