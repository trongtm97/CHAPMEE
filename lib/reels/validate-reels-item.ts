import { normalizeReelsBackgroundForStorage } from "@/lib/reels/resolve-reels-background";
import { truncateReelsBodyAtBoundary } from "@/lib/reels/clean-reels-source-text";
import { LOCAL_MEDIA_URL_ERROR } from "@/lib/media/content-media-validator";
import {
  REELS_BODY_MAX,
  REELS_CTA_MAX,
  REELS_HOOK_MAX,
  type ReelsFormValues
} from "@/types/reels";

const URL_PATTERN = /https?:\/\/|www\./gi;

export type ReelsValidationMode = "draft" | "publish";

export type ReelsValidationResult = {
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

export function validateReelsContent(
  values: Partial<ReelsFormValues>,
  mode: ReelsValidationMode
): ReelsValidationResult {
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

  if (hook.length > REELS_HOOK_MAX) {
    errors.push(`Hook tối đa ${REELS_HOOK_MAX} ký tự.`);
  }

  if (body.length > REELS_BODY_MAX) {
    errors.push(`Nội dung tối đa ${REELS_BODY_MAX} ký tự.`);
  }

  if (cta.length > REELS_CTA_MAX) {
    errors.push(`CTA tối đa ${REELS_CTA_MAX} ký tự.`);
  }

  const urlCount = countUrls(`${hook} ${body} ${cta}`);

  if (urlCount > 2) {
    errors.push("Không được chèn quá nhiều liên kết trong Reels.");
  }

  let backgroundImageUrl: string | null = null;
  try {
    backgroundImageUrl = normalizeReelsBackgroundForStorage(values.backgroundImageUrl);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : LOCAL_MEDIA_URL_ERROR);
  }

  if (errors.length > 0) {
    return { errors, ok: false };
  }

  return {
    errors: [],
    ok: true,
    values: {
      backgroundImageUrl,
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

export function autoTrimReelsBody(body: string) {
  return truncateReelsBodyAtBoundary(body, REELS_BODY_MAX);
}
