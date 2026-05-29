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
  | "hidden";

export type StudioStorySort = "updated" | "created" | "reads" | "title";

export type StudioChapterListFilter =
  | "all"
  | "draft"
  | "scheduled"
  | "published"
  | "rejected"
  | "hidden";

export type StudioChapterSort =
  | "number_asc"
  | "number_desc"
  | "updated"
  | "scheduled";

export const STUDIO_LIST_PAGE_SIZE = 20;
