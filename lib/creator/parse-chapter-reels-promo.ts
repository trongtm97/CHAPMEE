import type { ChapterReelsPromoDraft } from "@/types/chapter-reels-promo";
import type { ReelsSourceType } from "@/types/reels";

function parseOptionalInt(value: FormDataEntryValue | null) {
  if (value == null || value === "") {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

export function parseChapterReelsPromoFromFormData(
  formData: FormData
): ChapterReelsPromoDraft {
  const sourceType = String(formData.get("reels_source_type") ?? "").trim();

  return {
    body: String(formData.get("reels_body") ?? "").trim(),
    enabled: formData.get("reels_promo_enabled") === "1",
    hook: String(formData.get("reels_hook") ?? "").trim(),
    sourceTextEnd: parseOptionalInt(formData.get("reels_source_text_end")),
    sourceTextStart: parseOptionalInt(formData.get("reels_source_text_start")),
    sourceType: (sourceType || "manual_selection") as ReelsSourceType
  };
}
