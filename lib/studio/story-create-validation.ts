import { isUrlSafeSlug } from "@/lib/slugify";
import type { StoryFormIntent } from "@/lib/creator/storyFormValidation";
import type { StoryStructureType } from "@/types/story-structure";

export type StoryCreateFieldIssue = {
  field: string;
  message: string;
  level: "error" | "warning";
};

export type ChapteredComposerPath =
  | "story_only"
  | "first_chapter_composer"
  | "first_chapter_plain";

export type StandaloneComposerPath =
  | "standalone_composer"
  | "standalone_plain"
  | "standalone_draft_only";

export type StoryComposerPath = ChapteredComposerPath | StandaloneComposerPath;

export type StoryCreateStepId = "basic" | "taxonomy" | "composer" | "publish";

export type StoryCreateValidationInput = {
  intent: StoryFormIntent;
  title: string;
  slug: string;
  hook: string;
  shortDescription: string;
  useTaxonomy: boolean;
  hasMainGenre: boolean;
  hasContentType: boolean;
  hasAgeRating: boolean;
  presentationMode: string;
  contentWarningsConfirmed: boolean;
  guidelinesAcknowledged: boolean;
  hasCoverPreview: boolean;
  composerPath: StoryComposerPath;
  structureType: StoryStructureType;
  firstChapterTitle?: string;
  standaloneHasContent?: boolean;
  standaloneHasPlainText?: boolean;
};

export type StoryCreateValidationOptions = {
  /** Chỉ hiện lỗi sau khi user submit hoặc bấm tiếp tục */
  showErrors?: boolean;
  /** Field đã touched — hiện lỗi riêng field đó */
  touchedFields?: Set<string>;
};

function shouldShowIssue(
  field: string,
  options?: StoryCreateValidationOptions
): boolean {
  if (!options) return true;
  if (options.showErrors) return true;
  return options.touchedFields?.has(field) ?? false;
}

function pushIssue(
  issues: StoryCreateFieldIssue[],
  issue: StoryCreateFieldIssue,
  options?: StoryCreateValidationOptions
) {
  if (shouldShowIssue(issue.field, options)) {
    issues.push(issue);
  }
}

export function validateStoryCreateClient(
  input: StoryCreateValidationInput,
  options?: StoryCreateValidationOptions
): StoryCreateFieldIssue[] {
  const issues: StoryCreateFieldIssue[] = [];
  const title = input.title.trim();
  const slug = input.slug.trim();

  if (!title) {
    pushIssue(
      issues,
      {
        field: "title",
        message: "Vui lòng nhập tiêu đề truyện.",
        level: "error"
      },
      options
    );
  }

  const needsFullFields = input.intent !== "draft";

  if (needsFullFields) {
    if (!slug) {
      pushIssue(
        issues,
        {
          field: "slug",
          message: "Vui lòng nhập đường dẫn (slug).",
          level: "error"
        },
        options
      );
    } else if (!isUrlSafeSlug(slug)) {
      pushIssue(
        issues,
        {
          field: "slug",
          message: "Slug chỉ dùng chữ thường, số và dấu gạch ngang.",
          level: "error"
        },
        options
      );
    }

    if (!input.shortDescription.trim()) {
      pushIssue(
        issues,
        {
          field: "short_description",
          message: "Vui lòng nhập mô tả ngắn.",
          level: "error"
        },
        options
      );
    }
  }

  const needsTaxonomy =
    needsFullFields && input.useTaxonomy && input.intent !== "draft";

  if (needsTaxonomy && input.intent === "review") {
    if (!input.hasContentType) {
      pushIssue(
        issues,
        {
          field: "content_type",
          message: "Chọn loại nội dung chính.",
          level: "error"
        },
        options
      );
    }
    if (!input.hasMainGenre) {
      pushIssue(
        issues,
        {
          field: "main_genre",
          message: "Chọn thể loại chính.",
          level: "error"
        },
        options
      );
    }
    if (!input.hasAgeRating) {
      pushIssue(
        issues,
        {
          field: "age_rating",
          message: "Chọn độ tuổi phù hợp.",
          level: "error"
        },
        options
      );
    }
    if (!input.presentationMode) {
      pushIssue(
        issues,
        {
          field: "presentation_mode",
          message: "Chọn cách trình bày.",
          level: "error"
        },
        options
      );
    }
    if (!input.contentWarningsConfirmed) {
      pushIssue(
        issues,
        {
          field: "content_warnings_confirmed",
          message: "Xác nhận phân loại và cảnh báo nội dung.",
          level: "error"
        },
        options
      );
    }
  }

  if (input.intent === "review" && !input.guidelinesAcknowledged) {
    pushIssue(
      issues,
      {
        field: "guidelines_ack",
        message: "Xác nhận quyền sở hữu và quy định cộng đồng.",
        level: "error"
      },
      options
    );
  }

  if (
    input.intent === "review" &&
    input.structureType === "standalone" &&
    input.composerPath === "standalone_composer" &&
    !input.standaloneHasContent
  ) {
    pushIssue(
      issues,
      {
        field: "standalone_content",
        message: "Thêm nội dung truyện một phần trước khi gửi duyệt.",
        level: "error"
      },
      options
    );
  }

  if (
    input.intent === "review" &&
    input.structureType === "standalone" &&
    input.composerPath === "standalone_plain" &&
    !input.standaloneHasPlainText
  ) {
    pushIssue(
      issues,
      {
        field: "standalone_plain",
        message: "Nhập nội dung văn bản trước khi gửi duyệt.",
        level: "error"
      },
      options
    );
  }

  if (needsFullFields && !input.hook.trim()) {
    pushIssue(
      issues,
      {
        field: "hook",
        message: "Hook giúp thu hút độc giả — nên thêm trước khi xuất bản.",
        level: "warning"
      },
      options
    );
  }

  if (
    input.structureType === "chaptered" &&
    (input.intent === "create_and_chapter" ||
      input.composerPath === "first_chapter_composer" ||
      input.composerPath === "first_chapter_plain")
  ) {
    if (!input.firstChapterTitle?.trim()) {
      pushIssue(
        issues,
        {
          field: "first_chapter_title",
          message: "Nhập tiêu đề chương đầu (khuyến nghị).",
          level: "warning"
        },
        options
      );
    }
  }

  return issues;
}

export function validateStoryCreateStep(
  step: StoryCreateStepId,
  input: StoryCreateValidationInput
): StoryCreateFieldIssue[] {
  const issues: StoryCreateFieldIssue[] = [];
  const opts = { showErrors: true } satisfies StoryCreateValidationOptions;

  if (step === "basic") {
    if (!input.title.trim()) {
      issues.push({
        field: "title",
        message: "Vui lòng nhập tiêu đề truyện.",
        level: "error"
      });
    }
    const slug = input.slug.trim();
    if (slug && !isUrlSafeSlug(slug)) {
      issues.push({
        field: "slug",
        message: "Slug chỉ dùng chữ thường, số và dấu gạch ngang.",
        level: "error"
      });
    }
    return issues;
  }

  if (step === "taxonomy" && input.useTaxonomy) {
    if (!input.hasContentType) {
      issues.push({
        field: "content_type",
        message: "Chọn loại nội dung chính.",
        level: "error"
      });
    }
    if (!input.hasMainGenre) {
      issues.push({
        field: "main_genre",
        message: "Chọn thể loại chính.",
        level: "error"
      });
    }
    if (!input.hasAgeRating) {
      issues.push({
        field: "age_rating",
        message: "Chọn độ tuổi phù hợp.",
        level: "error"
      });
    }
    if (!input.presentationMode) {
      issues.push({
        field: "presentation_mode",
        message: "Chọn cách trình bày.",
        level: "error"
      });
    }
    return issues;
  }

  if (step === "composer") {
    if (
      input.structureType === "standalone" &&
      input.composerPath === "standalone_composer" &&
      !input.standaloneHasContent
    ) {
      issues.push({
        field: "standalone_content",
        message: "Soạn nội dung hoặc chọn «Chỉ tạo bản nháp».",
        level: "warning"
      });
    }
    if (
      input.structureType === "standalone" &&
      input.composerPath === "standalone_plain" &&
      !input.standaloneHasPlainText
    ) {
      issues.push({
        field: "standalone_plain",
        message: "Nhập văn bản hoặc chọn «Chỉ tạo bản nháp».",
        level: "warning"
      });
    }
  }

  if (step === "publish" && input.intent === "review") {
    return validateStoryCreateClient(input, opts);
  }

  return issues;
}

export function hasBlockingStoryCreateIssues(
  issues: StoryCreateFieldIssue[],
  intent: StoryFormIntent
): boolean {
  if (intent === "draft") {
    return issues.some((i) => i.field === "title" && i.level === "error");
  }
  return issues.some((i) => i.level === "error");
}
