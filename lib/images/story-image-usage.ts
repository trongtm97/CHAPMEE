import type { StoryImageVariant } from "@/types/story-images";

export const STORY_IMAGE_USAGE = {
  discoverCard: "landscape",
  storyHero: "landscape",
  swipeBackground: "landscape",
  libraryCard: "portrait",
  searchResult: "thumb",
  adminList: "thumb",
  collectionPreview: "square",
  communityCard: "landscape",
  /** Danh mục /truyen — thẻ lưới desktop */
  catalogGrid: "landscape",
  /** Danh mục /truyen — hàng danh sách mobile */
  catalogRow: "thumb"
} as const satisfies Record<string, StoryImageVariant>;

export type StoryImageUsageKey = keyof typeof STORY_IMAGE_USAGE;

export function getVariantForUsage(usage: StoryImageUsageKey): StoryImageVariant {
  return STORY_IMAGE_USAGE[usage];
}

/** Tailwind aspect classes paired with each usage slot. */
export const STORY_IMAGE_ASPECT_CLASS: Record<StoryImageUsageKey, string> = {
  discoverCard: "aspect-video w-full",
  storyHero: "aspect-video w-full max-h-56 sm:max-h-64",
  swipeBackground: "aspect-video w-full",
  libraryCard: "aspect-[2/3]",
  searchResult: "",
  adminList: "",
  collectionPreview: "aspect-square",
  communityCard: "aspect-video w-full",
  catalogGrid: "aspect-video w-full",
  catalogRow: ""
};
