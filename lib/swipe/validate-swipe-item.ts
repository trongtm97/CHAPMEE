import { truncateSwipeBodyAtBoundary } from "@/lib/swipe/clean-swipe-source-text";
import {
  SWIPE_BODY_MAX,
  SWIPE_CTA_MAX,
  SWIPE_HOOK_MAX,
  type SwipeFormValues
} from "@/types/swipe";

const URL_PATTERN = /https?:\/\/|www\./gi;

export type SwipeValidationMode = "draft" | "publish";

export type SwipeValidationResult = {
  ok: boolean;
  errors: string[];
  values?: {
    hook: string;
    body: string;
    cta: string | null;
    ctaType: string | null;
    title: string | null;
      storyId: string | null;
    chapterId: string | null;
    backgroundImageUrl: string | null;
  };
};

function countUrls(value: string) {
  return (value.match(URL_PATTERN) ?? []).length;
}

export function validateSwipeContent(
  values: Partial<SwipeFormValues>,
  mode: SwipeValidationMode
): SwipeValidationResult {
  const errors: string[] = [];
  const hook = values.hook?.trim() ?? "";
  const body = values.body?.trim() ?? "";
  const cta = values.cta?.trim() ?? "";
  const storyId = values.storyId?.trim() ?? "";

  if (mode === "publish") {
    if (!storyId) {
      errors.push("Chọn truyện liên kết trước khi đăng.");
    }

    if (!hook) {
      errors.push("Hook không được để trống.");
    }

    if (!body) {
      errors.push("Nội dung không được để trống.");
    }
  }

  if (mode === "draft") {
    const hasContent = Boolean(hook || body || storyId || values.title?.trim());

    if (!hasContent) {
      errors.push("Nháp cần ít nhất hook, nội dung, tiêu đề tạm hoặc truyện liên kết.");
    }
  }

  if (hook.length > SWIPE_HOOK_MAX) {
    errors.push(`Hook tối đa ${SWIPE_HOOK_MAX} ký tự.`);
  }

  if (body.length > SWIPE_BODY_MAX) {
    errors.push(`Nội dung tối đa ${SWIPE_BODY_MAX} ký tự.`);
  }

  if (cta.length > SWIPE_CTA_MAX) {
    errors.push(`CTA tối đa ${SWIPE_CTA_MAX} ký tự.`);
  }

  const urlCount = countUrls(`${hook} ${body} ${cta}`);

  if (urlCount > 2) {
    errors.push("Không được chèn quá nhiều liên kết trong Swipe.");
  }

  if (errors.length > 0) {
    return { errors, ok: false };
  }

  return {
    errors: [],
    ok: true,
    values: {
      backgroundImageUrl: values.backgroundImageUrl?.trim() || null,
      body,
      chapterId: values.chapterId?.trim() || null,
      cta: cta || null,
      ctaType: values.ctaType?.trim() || null,
      hook,
      storyId: storyId || null,
      title: values.title?.trim() || null
    }
  };
}

export function autoTrimSwipeBody(body: string) {
  return truncateSwipeBodyAtBoundary(body, SWIPE_BODY_MAX);
}
