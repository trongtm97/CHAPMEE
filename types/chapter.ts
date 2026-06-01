export type ChapterSort = "asc" | "desc";

export type StoryChapterMeta = {
  id: string;
  episodeNumber: number;
  title: string;
  slug: string;
  publicCode: string;
  excerpt: string | null;
  publishedAt: string | null;
};

export type ChapterRange = {
  start: number;
  end: number;
  label: string;
};

export type StoryChaptersResult = {
  chapters: StoryChapterMeta[];
  totalChapters: number;
  currentRange: ChapterRange | null;
  availableRanges: ChapterRange[];
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  sort: ChapterSort;
};

export type StoryReadingProgress = {
  episodeId: string;
  episodeNumber: number;
  episodeTitle: string;
  episodeSlug: string;
  episodePublicCode: string;
  progressPercent: number;
};
