import {
  formatStoryImageMissingVariantsLabel,
  getStoryImageMissingVariants
} from "@/lib/images/story-image-health";
import type { StoryImage } from "@/types/story-images";

type StoryImageVariantWarningProps = {
  storyId: string;
  currentImage?: StoryImage | null;
};

export function StoryImageVariantWarning({
  currentImage,
  storyId
}: StoryImageVariantWarningProps) {
  const missing = getStoryImageMissingVariants(currentImage);

  if (missing.length === 0) {
    return null;
  }

  const label = formatStoryImageMissingVariantsLabel(missing);

  if (process.env.NODE_ENV !== "production") {
    console.warn(
      "[story-images] Story image variants missing:",
      storyId,
      missing.join(", ")
    );
  }

  return (
    <p
      className="rounded-lg border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-xs leading-5 text-amber-100"
      role="status"
    >
      Một số kích thước ảnh bìa chưa đầy đủ ({label}). Bạn có thể tải lại ảnh bìa để
      tạo lại các biến thể.
    </p>
  );
}
