import { isUrlSafeSlug } from "@/lib/slugify";
import type { StoryFormIntent } from "@/lib/creator/storyFormValidation";
import type { StoryStructureType } from "@/types/story-structure";
import type { ContentOrigin } from "@/lib/content-origin/content-origin-types";
import { isKnownStorySourceLanguage } from "@/lib/creator/story-source-languages";
import {
  isValidSourceUrl,
  SOURCE_URL_VALIDATION_MESSAGE
} from "@/lib/creator/validate-source-url";

export type StoryCreateFieldIssue = {
  field: string;
  message: string;
  level: "error" | "warning";
};

export type StoryCreateStepId = "basic" | "taxonomy";

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
  hasCoverPreview: boolean;
  structureType: StoryStructureType;
  contentOrigin: ContentOrigin | "";
  translationMeta: {
    sourceTitle: string;
    sourceAuthorName: string;
    originalLanguage: string;
    sourceUrl: string;
  };
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
  const needsFullFields = input.intent !== "draft";

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

  if (needsFullFields && !input.contentOrigin) {
    pushIssue(
      issues,
      {
        field: "content_origin",
        message: "Chọn Truyện Sáng Tác hoặc Truyện Dịch trước khi tiếp tục.",
        level: "error"
      },
      options
    );
  } else if (input.contentOrigin === "translation" && needsFullFields) {
    const originalLanguage = input.translationMeta.originalLanguage.trim();
    if (!originalLanguage) {
      pushIssue(
        issues,
        {
          field: "original_language",
          message: "Chọn Ngôn ngữ gốc.",
          level: "error"
        },
        options
      );
    } else if (
      !isKnownStorySourceLanguage(originalLanguage) &&
      originalLanguage.length < 2
    ) {
      pushIssue(
        issues,
        {
          field: "original_language",
          message: "Nhập tên ngôn ngữ khác (ít nhất 2 ký tự).",
          level: "error"
        },
        options
      );
    }
    if (!input.translationMeta.sourceUrl.trim()) {
      pushIssue(
        issues,
        {
          field: "source_url",
          message: "Nhập link nguồn gốc.",
          level: "error"
        },
        options
      );
    } else if (!isValidSourceUrl(input.translationMeta.sourceUrl)) {
      pushIssue(
        issues,
        {
          field: "source_url",
          message: SOURCE_URL_VALIDATION_MESSAGE,
          level: "error"
        },
        options
      );
    }
  }

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
  }

  const needsTaxonomy =
    needsFullFields && input.useTaxonomy && input.intent === "review";

  if (needsTaxonomy) {
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

  return issues;
}

export function validateStoryCreateStep(
  step: StoryCreateStepId,
  input: StoryCreateValidationInput
): StoryCreateFieldIssue[] {
  const issues: StoryCreateFieldIssue[] = [];

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
