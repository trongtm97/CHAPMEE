export type SwipeItemStatus =
  | "draft"
  | "scheduled"
  | "published"
  | "hidden"
  | "rejected";

export type SwipeSourceType =
  | "manual"
  | "chapter_start"
  | "dialogue"
  | "question"
  | "ending"
  | "manual_selection"
  | "story_description";

export type SwipeCtaPreset =
  | "read_chapter"
  | "view_story"
  | "save_story"
  | "follow_author"
  | "guess_next"
  | "custom";

export const SWIPE_HOOK_MAX = 80;
export const SWIPE_BODY_MAX = 500;
export const SWIPE_BODY_RECOMMENDED_MIN = 120;
export const SWIPE_BODY_RECOMMENDED_MAX = 300;
export const SWIPE_CTA_MAX = 60;

export const SWIPE_CTA_PRESETS: Array<{ id: SwipeCtaPreset; label: string }> = [
  { id: "read_chapter", label: "Đọc tiếp chương này" },
  { id: "view_story", label: "Xem truyện ngay" },
  { id: "save_story", label: "Lưu truyện để đọc tiếp" },
  { id: "follow_author", label: "Theo dõi tác giả" },
  { id: "guess_next", label: "Bạn đoán chuyện gì xảy ra tiếp?" },
  { id: "custom", label: "Tùy chỉnh" }
];

export type SwipeListTab =
  | "all"
  | "draft"
  | "scheduled"
  | "published"
  | "hidden"
  | "needs_fix";

export type SwipeItemRecord = {
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
  status: SwipeItemStatus;
  scheduledAt: string | null;
  publishedAt: string | null;
  sourceType: SwipeSourceType | null;
  sourceTextStart: number | null;
  sourceTextEnd: number | null;
  viewCount: number;
  ctaClickCount: number;
  createdAt: string;
  updatedAt: string;
};

export type SwipeItemListItem = SwipeItemRecord & {
  storyTitle: string;
  storySlug: string;
  chapterTitle: string | null;
  chapterNumber: number | null;
};

export type SwipeSuggestionResult = {
  hook: string;
  body: string;
  sourceType: SwipeSourceType;
  sourceTextStart: number | null;
  sourceTextEnd: number | null;
};

export type SwipeFormValues = {
  storyId: string;
  chapterId: string | null;
  title: string;
  hook: string;
  body: string;
  cta: string;
  ctaType: SwipeCtaPreset | string;
  backgroundImageUrl: string | null;
  backgroundMode: "gradient" | "story_cover" | "story_landscape" | "chapter" | "upload";
};
