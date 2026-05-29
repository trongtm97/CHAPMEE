import { getStoryImageVariantUrl, type StoryImage, type StoryImageVariant } from "@/types/story-images";

/** Các variant hiển thị cần có sau pipeline upload (không tính original). */
export const STORY_IMAGE_DISPLAY_VARIANTS: Exclude<StoryImageVariant, "original">[] = [
  "portrait",
  "landscape",
  "square",
  "thumb",
  "blur"
];

export function getStoryImageMissingVariants(
  image: StoryImage | null | undefined
): Exclude<StoryImageVariant, "original">[] {
  if (!image) {
    return [];
  }

  return STORY_IMAGE_DISPLAY_VARIANTS.filter((variant) => {
    const url = getStoryImageVariantUrl(image, variant);
    return !url?.trim();
  });
}

export function hasStoryImageVariantGaps(image: StoryImage | null | undefined): boolean {
  return getStoryImageMissingVariants(image).length > 0;
}

export function formatStoryImageMissingVariantsLabel(
  missing: Exclude<StoryImageVariant, "original">[]
): string {
  if (missing.length === 0) {
    return "";
  }

  const labels: Record<Exclude<StoryImageVariant, "original">, string> = {
    portrait: "dọc",
    landscape: "ngang",
    square: "vuông",
    thumb: "thumb",
    blur: "blur"
  };

  return missing.map((variant) => labels[variant]).join(", ");
}

/** Ghi log server khi thiếu variant (admin/debug). */
export function logStoryImageVariantGap(storyId: string, image: StoryImage | null | undefined) {
  const missing = getStoryImageMissingVariants(image);

  if (missing.length === 0) {
    return;
  }

  console.warn(
    "[story-images] Story image variants missing:",
    storyId,
    missing.join(", ")
  );
}
