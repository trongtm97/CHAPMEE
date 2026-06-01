export type ReelsItemStatus =
  | "draft"
  | "scheduled"
  | "published"
  | "hidden"
  | "rejected";

export type ReelsSourceType =
  | "manual"
  | "chapter_start"
  | "dialogue"
  | "question"
  | "ending"
  | "manual_selection"
  | "story_description";

export type ReelsCtaPreset =
  | "read_chapter"
  | "view_story"
  | "save_story"
  | "follow_author"
  | "guess_next"
  | "custom";

export const REELS_HOOK_MAX = 80;
export const REELS_BODY_MAX = 500;
export const REELS_BODY_RECOMMENDED_MIN = 120;
export const REELS_BODY_RECOMMENDED_MAX = 300;
export const REELS_CTA_MAX = 60;

export const REELS_CTA_PRESETS: Array<{ id: ReelsCtaPreset; label: string }> = [
  { id: "read_chapter", label: "Đọc tiếp chương này" },
  { id: "view_story", label: "Xem truyện ngay" },
  { id: "save_story", label: "Lưu truyện để đọc tiếp" },
  { id: "follow_author", label: "Theo dõi tác giả" },
  { id: "guess_next", label: "Bạn đoán chuyện gì xảy ra tiếp?" },
  { id: "custom", label: "Tùy chỉnh" }
];

export type ReelsListTab =
  | "all"
  | "draft"
  | "scheduled"
  | "published"
  | "hidden"
  | "needs_fix";

export type ReelsListSort =
  | "updated"
  | "created"
  | "views"
  | "ctr"
  | "reads"
  | "needs_attention";

export type ReelsTimeFilter = "all" | "today" | "7d" | "30d" | "custom";

export type ReelsSourceFilter = "all" | "manual" | "chapter" | "import" | "ai";

export const REELS_LIST_PAGE_SIZE_DEFAULT = 20;
export const REELS_LIST_PAGE_SIZES = [10, 20, 50] as const;
export type ReelsListPageSize = (typeof REELS_LIST_PAGE_SIZES)[number];

export type ReelsStudioStats = {
  total: number;
  published: number;
  draft: number;
  scheduled: number;
  needsFix: number;
  views7d: number;
  reads7d: number;
  ctr7d: number;
  readsFromReels: number;
};

export type ReelsTaskCategory =
  | "all"
  | "draft"
  | "needs_fix"
  | "low_performance"
  | "upcoming";

export type ReelsTaskItem = {
  id: string;
  category: Exclude<ReelsTaskCategory, "all">;
  title: string;
  description: string;
  primaryAction: { label: string; href: string };
  secondaryAction?: { label: string; href: string };
};

export type ReelsStudioListItem = ReelsItemListItem & {
  ctr: number;
  genreId: string | null;
  genreName: string | null;
  commentCount: number;
  saveCount: number;
  sourceLabel: string;
  needsAttention: boolean;
  isLowCtr: boolean;
  displayTitle: string;
};

export type ReelsItemRecord = {
  id: string;
  ownerId: string;
  storyId: string;
  chapterId: string | null;
  title: string | null;
  hook: string;
  body: string;
  cta: string | null;
  ctaType: string | null;
  backgroundImageUrl: string | null;
  status: ReelsItemStatus;
  scheduledAt: string | null;
  publishedAt: string | null;
  sourceType: ReelsSourceType | null;
  sourceTextStart: number | null;
  sourceTextEnd: number | null;
  viewCount: number;
  ctaClickCount: number;
  createdAt: string;
  updatedAt: string;
};

export type ReelsItemListItem = ReelsItemRecord & {
  storyTitle: string;
  storySlug: string;
  chapterTitle: string | null;
  chapterNumber: number | null;
};

export type ReelsSuggestionResult = {
  hook: string;
  body: string;
  sourceType: ReelsSourceType;
  sourceTextStart: number | null;
  sourceTextEnd: number | null;
};

export type ReelsFormValues = {
  storyId: string;
  chapterId: string | null;
  title: string;
  hook: string;
  body: string;
  cta: string;
  ctaType: ReelsCtaPreset | string;
  backgroundImageUrl: string | null;
  backgroundMode: "gradient" | "story_cover" | "story_landscape" | "chapter" | "upload";
};
