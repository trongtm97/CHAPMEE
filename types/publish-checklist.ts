export type PublishChecklistTargetType = "story" | "chapter" | "swipe";

export type PublishChecklistRuleStatus = "pass" | "warning" | "error";

export type PublishChecklistRule = {
  id: string;
  label: string;
  status: PublishChecklistRuleStatus;
  message: string;
  targetType: PublishChecklistTargetType;
  blocking: boolean;
};

export type PublishChecklistResult = {
  rules: PublishChecklistRule[];
  ok: boolean;
  hasBlockingErrors: boolean;
  hasWarnings: boolean;
};

/** Mô tả truyện ngắn hơn ngưỡng này → cảnh báo (không chặn). */
export const STORY_DESCRIPTION_MIN_CHARS = 80;

/** Nội dung chương ngắn hơn ngưỡng này → cảnh báo. */
export const CHAPTER_CONTENT_MIN_CHARS = 500;

/** Nội dung Swipe ngắn hơn ngưỡng này → cảnh báo. */
export const SWIPE_BODY_MIN_CHARS = 80;
