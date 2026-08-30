import {
  createRule,
  isEpisodeStatusBlockedForPublish,
  isStoryStatusBlockedForPublish,
  summarizeChecklist
} from "@/lib/publish/checklist-utils";
import type { StoryPublishInput } from "@/lib/publish/validate-story-before-publish";
import { canViewPublicStory } from "@/lib/visibility/contentVisibility";
import type { PublishChecklistResult } from "@/types/publish-checklist";
import { CHAPTER_CONTENT_MIN_CHARS } from "@/types/publish-checklist";

/** Chỉ kiểm tra truyện cha cho phép đăng chương — không áp checklist đăng truyện. */
function validateParentStoryForChapterPublish(
  story: StoryPublishInput | null | undefined
): PublishChecklistResult {
  if (!story) {
    return summarizeChecklist([
      createRule({
        blocking: true,
        id: "story",
        label: "Chưa thuộc truyện hợp lệ",
        message: "Chương phải thuộc một truyện hợp lệ của bạn.",
        ok: false,
        targetType: "chapter"
      })
    ]);
  }

  const storyBlocked = isStoryStatusBlockedForPublish(story.status);
  const storyPubliclyVisible = canViewPublicStory(story.status, story.visibility);

  return summarizeChecklist([
    createRule({
      blocking: true,
      id: "parent-story-status",
      label: "Truyện cha đang bị chặn đăng",
      message:
        "Truyện đang ở trạng thái không được đăng chương (từ chối, chờ duyệt hoặc lưu trữ).",
      ok: !storyBlocked,
      targetType: "story"
    }),
    createRule({
      id: "parent-story-not-public",
      label: "Truyện chưa hiển thị công khai",
      message:
        "Chương đã đăng sẽ tự hiện khi truyện công khai — không cần đăng lại. Chương nháp vẫn ẩn cho đến khi bạn đăng thủ công.",
      ok: storyPubliclyVisible,
      targetType: "story",
      warnIfFail: true
    })
  ]);
}

export type ChapterPublishInput = {
  title?: string | null;
  content?: string | null;
  episodeNumber?: number;
  status?: string | null;
  seoDescription?: string | null;
  authorNote?: string | null;
  isSaved?: boolean;
  hasDuplicateNumber?: boolean;
  story?: StoryPublishInput | null;
  storyValid?: boolean;
  hasReelsPromo?: boolean;
};

export function validateChapterBeforePublish(
  chapter: ChapterPublishInput,
  story?: StoryPublishInput | null
): PublishChecklistResult {
  const content = chapter.content?.trim() ?? "";
  const storyInput = story ?? chapter.story ?? null;

  const chapterRules = [
    createRule({
      blocking: true,
      id: "content",
      label: "Thiếu nội dung chương",
      message: "Thiếu nội dung chương.",
      ok: Boolean(content),
      targetType: "chapter"
    }),
    createRule({
      blocking: false,
      id: "saved",
      label: "Lưu nháp trước khi đăng",
      message: "Nên lưu nháp trước khi đăng để tránh mất dữ liệu.",
      ok: chapter.isSaved !== false,
      targetType: "chapter",
      warnIfFail: true
    }),
    createRule({
      blocking: true,
      id: "story",
      label: "Chưa thuộc truyện hợp lệ",
      message: "Chương phải thuộc một truyện hợp lệ của bạn.",
      ok: chapter.storyValid !== false && Boolean(storyInput),
      targetType: "chapter"
    }),
    createRule({
      blocking: true,
      id: "number",
      label: "Số chương bị trùng",
      message: "Số chương đã tồn tại trong truyện. Đổi số chương.",
      ok: !chapter.hasDuplicateNumber,
      targetType: "chapter"
    }),
    createRule({
      blocking: true,
      id: "status",
      label: "Chương đang bị chặn đăng",
      message: "Chương đang ở trạng thái không được đăng (từ chối hoặc chờ duyệt).",
      ok: !isEpisodeStatusBlockedForPublish(chapter.status),
      targetType: "chapter"
    }),
    createRule({
      id: "content-length",
      label: "Nội dung quá ngắn",
      message: `Nội dung chương nên dài hơn ${CHAPTER_CONTENT_MIN_CHARS} ký tự.`,
      ok: content.length >= CHAPTER_CONTENT_MIN_CHARS,
      targetType: "chapter",
      warnIfFail: true
    }),
    createRule({
      id: "author-note",
      label: "Chưa có ghi chú tác giả",
      message: "Thêm ghi chú tác giả để trò chuyện với độc giả (tuỳ chọn).",
      ok: Boolean(chapter.authorNote?.trim()),
      targetType: "chapter",
      warnIfFail: true
    }),
    createRule({
      id: "seo",
      label: "Chưa có SEO description",
      message: "Thêm mô tả SEO cho chương.",
      ok: Boolean(chapter.seoDescription?.trim()),
      targetType: "chapter",
      warnIfFail: true
    }),
    createRule({
      id: "reels-promo",
      label: "Chưa tạo Reels quảng bá",
      message: "Tạo Reels quảng bá cho chương (khuyến nghị).",
      ok: Boolean(chapter.hasReelsPromo),
      targetType: "chapter",
      warnIfFail: true
    })
  ];

  const chapterResult = summarizeChecklist(chapterRules);
  const parentResult = validateParentStoryForChapterPublish(storyInput);

  return summarizeChecklist([...chapterResult.rules, ...parentResult.rules]);
}
