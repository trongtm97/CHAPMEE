import { SWIPE_CTA_PRESETS } from "@/types/swipe";

export function resolveSwipeCtaLabel(cta: string | null, ctaType: string | null) {
  if (cta?.trim()) {
    return cta.trim();
  }

  const preset = SWIPE_CTA_PRESETS.find((item) => item.id === ctaType);

  return preset?.label ?? "Đọc tiếp";
}

export function resolveSwipeReadHref(input: {
  storySlug: string;
  episodeNumber?: number | null;
}) {
  if (input.episodeNumber && input.episodeNumber > 0) {
    return `/stories/${input.storySlug}/episodes/${input.episodeNumber}`;
  }

  return `/stories/${input.storySlug}`;
}
