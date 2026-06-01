import {
  getChapterUrl,
  getStoryUrl,
  type ChapterUrlFields,
  type StoryUrlFields
} from "@/lib/urls/paths";

export type { StoryUrlFields, ChapterUrlFields };

export { getStoryUrl, getChapterUrl, getProfileUrl } from "@/lib/urls/paths";

/** Canonical public story URL. */
export function getStoryDetailHref(story: StoryUrlFields): string {
  return getStoryUrl(story);
}

/** Canonical public chapter URL. */
export function getStoryChapterHref(
  story: StoryUrlFields,
  chapter: ChapterUrlFields
): string {
  return getChapterUrl(story, chapter);
}

/** Build story fields when only slug + public_code are available. */
export function toStoryUrlFields(
  slug: string,
  publicCode: string
): StoryUrlFields {
  return { slug, public_code: publicCode };
}

/** Build chapter fields when only slug + public_code are available. */
export function toChapterUrlFields(
  slug: string,
  publicCode: string
): ChapterUrlFields {
  return { slug, public_code: publicCode };
}
