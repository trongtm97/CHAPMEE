import { getChapterUrl, getStoryUrl } from "@/lib/urls/paths";
import { REELS_CTA_PRESETS } from "@/types/reels";

export function resolveReelsCtaLabel(cta: string | null, ctaType: string | null) {
  if (cta?.trim()) {
    return cta.trim();
  }

  const preset = REELS_CTA_PRESETS.find((item) => item.id === ctaType);

  return preset?.label ?? "Đọc tiếp";
}

export function resolveReelsReadHref(input: {
  storySlug: string;
  storyPublicCode: string;
  episodeSlug?: string | null;
  episodePublicCode?: string | null;
  episodeNumber?: number | null;
}) {
  const story = { slug: input.storySlug, public_code: input.storyPublicCode };

  if (input.episodeSlug && input.episodePublicCode) {
    return getChapterUrl(story, {
      slug: input.episodeSlug,
      public_code: input.episodePublicCode
    });
  }

  return getStoryUrl(story);
}
