import type { StoryImageVariant } from "@/types/story-images";
import { CHAPMEE_COVER_ASPECT_CLASS } from "@/lib/images/cover-sizes";

const PORTRAIT_COVER_ASPECT = `${CHAPMEE_COVER_ASPECT_CLASS} w-full`;

export const STORY_IMAGE_USAGE = {
  discoverCard: "portrait",
  storyHero: "portrait",
  /** Reels scene background — not a story card cover slot. */
  reelsBackground: "landscape",
  libraryCard: "portrait",
  searchResult: "thumb",
  adminList: "thumb",
  collectionPreview: "square",
  communityCard: "portrait",
  catalogGrid: "portrait",
  catalogRow: "portrait"
} as const satisfies Record<string, StoryImageVariant>;

export type StoryImageUsageKey = keyof typeof STORY_IMAGE_USAGE;

export function getVariantForUsage(usage: StoryImageUsageKey): StoryImageVariant {
  return STORY_IMAGE_USAGE[usage];
}

/** Tailwind aspect classes paired with each usage slot. */
export const STORY_IMAGE_ASPECT_CLASS: Record<StoryImageUsageKey, string> = {
  discoverCard: PORTRAIT_COVER_ASPECT,
  storyHero: PORTRAIT_COVER_ASPECT,
  reelsBackground: "aspect-video w-full",
  libraryCard: PORTRAIT_COVER_ASPECT,
  searchResult: `${CHAPMEE_COVER_ASPECT_CLASS}`,
  adminList: `${CHAPMEE_COVER_ASPECT_CLASS}`,
  collectionPreview: "aspect-square",
  communityCard: PORTRAIT_COVER_ASPECT,
  catalogGrid: PORTRAIT_COVER_ASPECT,
  catalogRow: `${CHAPMEE_COVER_ASPECT_CLASS}`
};
