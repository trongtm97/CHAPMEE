/** Trạng thái hiển thị chuẩn trên UI Studio (không nhất thiết 1:1 với DB). */
export type StudioDisplayStatus =
  | "draft"
  | "scheduled"
  | "published"
  | "paused"
  | "completed"
  | "hidden"
  | "under_review"
  | "rejected";

export type StudioDbContentStatus =
  | "draft"
  | "pending"
  | "approved"
  | "published"
  | "rejected"
  | "archived";

export type StudioStoryListFilter =
  | "all"
  | "draft"
  | "live"
  | "scheduled"
  | "completed"
  | "rejected"
  | "hidden"
  | "missing_cover";

export type StudioStorySort =
  | "updated"
  | "updated_asc"
  | "created"
  | "reads"
  | "reads_7d"
  | "saves"
  | "comments"
  | "title"
  | "chapters"
  | "main_genre"
  | "needs_attention";

export const STUDIO_LIST_PAGE_SIZES = [10, 20, 50] as const;
export type StudioListPageSize = (typeof STUDIO_LIST_PAGE_SIZES)[number];
export const STUDIO_LIST_PAGE_SIZE_DEFAULT: StudioListPageSize = 10;
export const STUDIO_LIST_PAGE_SIZE = STUDIO_LIST_PAGE_SIZE_DEFAULT;

export type StudioChapterListFilter =
  | "all"
  | "draft"
  | "scheduled"
  | "published"
  | "rejected"
  | "hidden"
  | "paid"
  | "free"
  | "has_comments";

export type StudioChapterSort =
  | "number_asc"
  | "number_desc"
  | "updated"
  | "scheduled"
  | "published"
  | "reads"
  | "comments";

export const STUDIO_CHAPTER_PAGE_SIZES = [25, 50, 100] as const;
export type StudioChapterPageSize = (typeof STUDIO_CHAPTER_PAGE_SIZES)[number];
export const STUDIO_CHAPTER_PAGE_SIZE_DEFAULT: StudioChapterPageSize = 25;
