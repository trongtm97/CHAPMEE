import {
  createRule,
  isStoryStatusBlockedForPublish,
  summarizeChecklist
} from "@/lib/publish/checklist-utils";
import {
  hasStandaloneContent,
  isChapteredStory,
  isStandaloneStory
} from "@/lib/stories/story-structure";
import type { PublishChecklistResult } from "@/types/publish-checklist";
import { STORY_DESCRIPTION_MIN_CHARS } from "@/types/publish-checklist";
import type { StoryStructureType } from "@/types/story-structure";

export type StoryPublishValidationInput = {
  title?: string | null;
  hook?: string | null;
  shortDescription?: string | null;
  longDescription?: string | null;
  coverUrl?: string | null;
  genreId?: string | null;
  tagIds?: string[];
  tagCount?: number;
  status?: string | null;
  visibility?: string | null;
  seoDescription?: string | null;
  hasCover?: boolean;
  hasReelsPromo?: boolean;
  taxonomyActive?: boolean;
  structureType?: StoryStructureType | null;
  standaloneContentJson?: unknown | null;
  standalonePlainText?: string | null;
  publishedChapterCount?: number;
  scheduledChapterCount?: number;
  composerHasErrors?: boolean;
  standaloneTooShort?: boolean;
};

function storyDescriptionText(input: StoryPublishValidationInput) {
  return (
    input.shortDescription?.trim() ||
    input.longDescription?.trim() ||
    input.hook?.trim() ||
    ""
  );
}

export function validateStoryForPublish(
  input: StoryPublishValidationInput
): PublishChecklistResult {
  const description = storyDescriptionText(input);
  const tagCount = input.tagIds?.length ?? input.tagCount ?? 0;
  const hasCover = input.hasCover ?? Boolean(input.coverUrl?.trim());
  const blocked = isStoryStatusBlockedForPublish(input.status);
  const structureType = input.structureType ?? "chaptered";
  const story = {
    structureType,
    standaloneContentJson: input.standaloneContentJson ?? null,
    standalonePlainText: input.standalonePlainText ?? null
  };

  const structureRules = isStandaloneStory(story)
    ? [
        createRule({
          blocking: true,
          id: "standalone-content",
          label: "Thiếu nội dung truyện một phần",
          message: "Thêm nội dung trước khi xuất bản truyện một phần.",
          ok: hasStandaloneContent(story),
          targetType: "story"
        }),
        createRule({
          blocking: true,
          id: "composer-valid",
          label: "Nội dung Composer có lỗi",
          message: "Sửa lỗi Composer trước khi xuất bản.",
          ok: !input.composerHasErrors,
          targetType: "story"
        }),
        createRule({
          id: "standalone-length",
          label: "Nội dung quá ngắn",
          message: "Nội dung một phần nên dài hơn để độc giả có trải nghiệm đọc tốt.",
          ok: !input.standaloneTooShort,
          targetType: "story",
          warnIfFail: true
        })
      ]
    : [
        createRule({
          blocking: true,
          id: "chapters",
          label: "Chưa có chương xuất bản",
          message: "Thêm ít nhất một chương đã xuất bản hoặc đã lên lịch.",
          ok:
            (input.publishedChapterCount ?? 0) > 0 ||
            (input.scheduledChapterCount ?? 0) > 0,
          targetType: "story"
        }),
        createRule({
          blocking: true,
          id: "composer-valid",
          label: "Chương có lỗi Composer",
          message: "Sửa lỗi Composer trong các chương trước khi xuất bản.",
          ok: !input.composerHasErrors,
          targetType: "story"
        })
      ];

  const rules = [
    createRule({
      blocking: true,
      id: "title",
      label: "Thiếu tiêu đề truyện",
      message: "Thiếu tiêu đề truyện.",
      ok: Boolean(input.title?.trim()),
      targetType: "story"
    }),
    createRule({
      blocking: true,
      id: "description",
      label: "Thiếu mô tả truyện",
      message: "Thiếu mô tả truyện (mô tả ngắn, dài hoặc hook).",
      ok: Boolean(description),
      targetType: "story"
    }),
    createRule({
      blocking: !input.taxonomyActive,
      id: "genre",
      label: "Chưa chọn danh mục",
      message: "Chọn danh mục (thể loại chính) cho truyện.",
      ok: Boolean(input.genreId),
      targetType: "story",
      warnIfFail: false
    }),
    createRule({
      blocking: !input.taxonomyActive,
      id: "tags",
      label: "Chưa chọn thể loại",
      message: input.taxonomyActive
        ? "Chọn ít nhất một thể loại phụ hoặc motif (khuyến nghị)."
        : "Chọn ít nhất một thể loại (tag).",
      ok: tagCount > 0,
      targetType: "story",
      warnIfFail: Boolean(input.taxonomyActive)
    }),
    createRule({
      blocking: true,
      id: "cover",
      label: "Thiếu ảnh bìa",
      message: "Thêm ảnh bìa trước khi đăng truyện public.",
      ok: hasCover,
      targetType: "story"
    }),
    createRule({
      blocking: true,
      id: "status",
      label: "Truyện đang bị chặn đăng",
      message:
        "Truyện đang ở trạng thái không được đăng (từ chối, lưu trữ hoặc chờ duyệt).",
      ok: !blocked,
      targetType: "story"
    }),
    createRule({
      id: "description-length",
      label: "Mô tả quá ngắn",
      message: `Mô tả nên dài hơn ${STORY_DESCRIPTION_MIN_CHARS} ký tự để người đọc hiểu truyện.`,
      ok: description.length >= STORY_DESCRIPTION_MIN_CHARS,
      targetType: "story",
      warnIfFail: true
    }),
    createRule({
      id: "seo",
      label: "Chưa có SEO description",
      message: "Thêm mô tả SEO để trang truyện hiển thị tốt trên công cụ tìm kiếm.",
      ok: Boolean(input.seoDescription?.trim()),
      targetType: "story",
      warnIfFail: true
    }),
    createRule({
      id: "reels-promo",
      label: "Chưa có Reels quảng bá",
      message: "Tạo Reels quảng bá để thu hút độc giả (khuyến nghị).",
      ok: Boolean(input.hasReelsPromo),
      targetType: "story",
      warnIfFail: true
    }),
    ...structureRules
  ];

  return summarizeChecklist(rules);
}

export function validateStoryStructureConsistency(input: {
  structureType: StoryStructureType;
  episodeCount: number;
  hasStandaloneContent: boolean;
}): string[] {
  const warnings: string[] = [];

  if (isStandaloneStory({ structureType: input.structureType }) && input.episodeCount > 0) {
    warnings.push("Truyện một phần đang có chương — kiểm tra lại cấu trúc.");
  }

  if (isChapteredStory({ structureType: input.structureType }) && input.hasStandaloneContent) {
    warnings.push("Truyện nhiều chương có nội dung standalone — nội dung chính nên nằm ở chương.");
  }

  if (isChapteredStory({ structureType: input.structureType }) && input.episodeCount === 0) {
    warnings.push("Truyện nhiều chương chưa có chương nào.");
  }

  return warnings;
}
