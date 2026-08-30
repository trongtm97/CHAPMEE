import { resolveReelsBackgroundUrl } from "@/lib/reels/resolve-reels-background";
import { resolveStoredMediaUrl } from "@/lib/media/media-url";
import { focalToObjectPosition } from "@/lib/images/parse-focal-point";
import {
  STORY_IMAGE_PLACEHOLDER_BLUR_CLASS,
  STORY_IMAGE_PLACEHOLDER_GRADIENT_CLASS
} from "@/lib/images/placeholders";
import type { StoryImageUsageKey } from "@/lib/images/story-image-usage";
import { getVariantForUsage } from "@/lib/images/story-image-usage";
import {
  STORY_IMAGE_VARIANT_OUTPUTS,
  getStoryImageVariantUrl,
  type StoryImage,
  type StoryImageVariant
} from "@/types/story-images";
import type { StoryWithImages } from "@/types/story-images";

export type StoryImageDescriptor = {
  src: string | null;
  alt: string;
  width: number;
  height: number;
  blurSrc: string | null;
  variant: StoryImageVariant | "placeholder";
  isPlaceholder: boolean;
  placeholderClassName: string;
  objectPosition: string;
};

export const STORY_IMAGE_VARIANT_DIMENSIONS: Record<
  StoryImageVariant,
  { width: number; height: number }
> = {
  original: { width: 2000, height: 2000 },
  portrait: STORY_IMAGE_VARIANT_OUTPUTS.portrait,
  landscape: STORY_IMAGE_VARIANT_OUTPUTS.landscape,
  square: STORY_IMAGE_VARIANT_OUTPUTS.square,
  thumb: { width: 320, height: 320 },
  blur: STORY_IMAGE_VARIANT_OUTPUTS.blur
};

const VARIANT_FALLBACK_CHAIN: Record<StoryImageVariant, StoryImageVariant[]> = {
  landscape: ["landscape", "thumb", "portrait"],
  portrait: ["portrait", "thumb", "landscape"],
  square: ["square", "thumb", "landscape"],
  thumb: ["thumb", "square", "landscape", "portrait"],
  blur: ["blur", "thumb"],
  original: ["original", "portrait", "landscape", "thumb"]
};

type NormalizedStory = {
  title: string;
  coverUrl: string | null;
  currentImage: StoryImage | null;
};

function normalizeStory(story: StoryWithImages): NormalizedStory {
  const raw = story as StoryWithImages & Record<string, unknown>;
  const legacyCover =
    story.coverUrl ??
    story.cover_url ??
    (typeof raw.coverImageUrl === "string" ? raw.coverImageUrl : null) ??
    (typeof raw.cover_image_url === "string" ? raw.cover_image_url : null) ??
    (typeof raw.coverAsset === "string" ? raw.coverAsset : null) ??
    (typeof raw.thumbnailUrl === "string" ? raw.thumbnailUrl : null) ??
    (typeof raw.thumbnail_url === "string" ? raw.thumbnail_url : null) ??
    (typeof raw.imageUrl === "string" ? raw.imageUrl : null) ??
    (typeof raw.image_url === "string" ? raw.image_url : null) ??
    null;

  return {
    title: story.title,
    coverUrl: legacyCover,
    currentImage: story.currentImage ?? story.current_image ?? null
  };
}

function pickUrlFromImage(image: StoryImage | null, variant: StoryImageVariant): string | null {
  if (!image) {
    return null;
  }

  const url = getStoryImageVariantUrl(image, variant);
  return url?.trim() ? url : null;
}

function resolveVariantUrl(
  normalized: NormalizedStory,
  requested: StoryImageVariant
): { url: string | null; resolvedVariant: StoryImageVariant | "placeholder" } {
  const chain = VARIANT_FALLBACK_CHAIN[requested];

  for (const variant of chain) {
    const fromImage = pickUrlFromImage(normalized.currentImage, variant);
    if (fromImage) {
      return { url: fromImage, resolvedVariant: variant };
    }
  }

  const legacyCover = normalized.coverUrl?.trim()
    ? resolveStoredMediaUrl(normalized.coverUrl)
    : null;
  if (legacyCover && requested !== "blur") {
    return { url: legacyCover, resolvedVariant: requested };
  }

  return { url: null, resolvedVariant: "placeholder" };
}

function buildDescriptor(
  normalized: NormalizedStory,
  requested: StoryImageVariant,
  alt?: string
): StoryImageDescriptor {
  const { url, resolvedVariant } = resolveVariantUrl(normalized, requested);
  const isPlaceholder = !url;
  const dimensions = STORY_IMAGE_VARIANT_DIMENSIONS[requested];
  const focal = normalized.currentImage
    ? { x: normalized.currentImage.focalX, y: normalized.currentImage.focalY }
    : { x: 0.5, y: 0.5 };

  const blurSrc =
    !isPlaceholder && normalized.currentImage
      ? pickUrlFromImage(normalized.currentImage, "blur") ??
        pickUrlFromImage(normalized.currentImage, "thumb")
      : null;

  return {
    src: url,
    alt: alt ?? normalized.title,
    width: dimensions.width,
    height: dimensions.height,
    blurSrc: isPlaceholder ? null : blurSrc,
    variant: isPlaceholder ? "placeholder" : resolvedVariant,
    isPlaceholder,
    placeholderClassName:
      requested === "blur"
        ? STORY_IMAGE_PLACEHOLDER_BLUR_CLASS
        : STORY_IMAGE_PLACEHOLDER_GRADIENT_CLASS,
    objectPosition: focalToObjectPosition(focal)
  };
}

/**
 * Resolve story image metadata for a variant (with fallbacks and placeholder).
 */
export function getStoryImage(
  story: StoryWithImages,
  variant: StoryImageVariant,
  options?: { alt?: string }
): StoryImageDescriptor {
  return buildDescriptor(normalizeStory(story), variant, options?.alt);
}

/**
 * Convenience: resolved `src` or null when only placeholder is available.
 */
export function getStoryImageSrc(
  story: StoryWithImages,
  variant: StoryImageVariant,
  options?: { alt?: string }
): string | null {
  return getStoryImage(story, variant, options).src;
}

export function getStoryImageForUsage(
  story: StoryWithImages,
  usage: StoryImageUsageKey,
  options?: { alt?: string }
): StoryImageDescriptor {
  return getStoryImage(story, getVariantForUsage(usage), options);
}

export function getStoryImageSet(
  story: StoryWithImages,
  options?: { alt?: string }
): Record<StoryImageVariant, StoryImageDescriptor> {
  const normalized = normalizeStory(story);
  const variants: StoryImageVariant[] = [
    "original",
    "portrait",
    "landscape",
    "square",
    "thumb",
    "blur"
  ];

  return Object.fromEntries(
    variants.map((variant) => [variant, buildDescriptor(normalized, variant, options?.alt)])
  ) as Record<StoryImageVariant, StoryImageDescriptor>;
}

/**
 * Reels full-bleed background: episode/chapter bg → story cover variants → blur (never original).
 */
export function getReelsBackgroundSrc(item: {
  title: string;
  storyCoverUrl?: string | null;
  episodeBackgroundUrl?: string | null;
  currentImage?: StoryImage | null;
}): string | null {
  const episodeUrl = resolveReelsBackgroundUrl(item.episodeBackgroundUrl);
  if (episodeUrl) {
    return episodeUrl;
  }

  const story: StoryWithImages = {
    title: item.title,
    coverUrl: item.storyCoverUrl ?? null,
    currentImage: item.currentImage ?? null
  };

  const landscape = getStoryImageSrc(story, "landscape");
  if (landscape) {
    return landscape;
  }

  const coverOnly = resolveStoredMediaUrl(item.storyCoverUrl);
  if (coverOnly) {
    return coverOnly;
  }

  return getStoryImageSrc(story, "blur");
}

/** Suggested `sizes` attribute for next/image by variant. */
export function getStoryImageSizes(variant: StoryImageVariant): string {
  switch (variant) {
    case "landscape":
      return "(max-width: 768px) 100vw, 640px";
    case "portrait":
      return "120px";
    case "square":
      return "160px";
    case "thumb":
      return "80px";
    case "blur":
      return "32px";
    case "original":
    default:
      return "100vw";
  }
}
