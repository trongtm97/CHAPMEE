import { ENTITY_CODE_PREFIX, type PublicEntityType } from "@/lib/urls/constants";
import { getProfileUrl } from "@/lib/profile/profile-url";

export type StoryUrlFields = {
  slug: string;
  public_code: string;
};

export type ChapterUrlFields = {
  slug: string;
  public_code: string;
};

export type ReelUrlFields = {
  slug: string;
  public_code: string;
};

export type ContentPostUrlFields = {
  slug: string;
  public_code: string;
};

export type AnnouncementUrlFields = {
  slug: string;
  public_code: string;
};

export type PolicyUrlFields = {
  slug: string;
  public_code: string;
};

function buildCodeSegment(
  slug: string,
  entityType: PublicEntityType,
  publicCode: string
): string {
  const prefix = ENTITY_CODE_PREFIX[entityType];
  return `${slug}-${prefix}.${publicCode}`;
}

export function buildStorySegment(slug: string, publicCode: string): string {
  return buildCodeSegment(slug, "story", publicCode);
}

export function buildChapterSegment(slug: string, publicCode: string): string {
  return buildCodeSegment(slug, "chapter", publicCode);
}

export function buildReelSegment(slug: string, publicCode: string): string {
  return buildCodeSegment(slug, "reel", publicCode);
}

export function buildContentPostSegment(slug: string, publicCode: string): string {
  return buildCodeSegment(slug, "content_post", publicCode);
}

export function buildAnnouncementSegment(slug: string, publicCode: string): string {
  return buildCodeSegment(slug, "announcement", publicCode);
}

export function buildPolicySegment(slug: string, publicCode: string): string {
  return buildCodeSegment(slug, "policy", publicCode);
}

export { getProfileUrl };

export function getStoryUrl(story: StoryUrlFields): string {
  return `/truyen/${buildStorySegment(story.slug, story.public_code)}`;
}

export function getChapterUrl(
  story: StoryUrlFields,
  chapter: ChapterUrlFields
): string {
  return `${getStoryUrl(story)}/chuong/${buildChapterSegment(chapter.slug, chapter.public_code)}`;
}

export function getReelUrl(reel: ReelUrlFields): string {
  return `/reels/${buildReelSegment(reel.slug, reel.public_code)}`;
}

export function getContentPostUrl(post: ContentPostUrlFields): string {
  return `/bai-viet/${buildContentPostSegment(post.slug, post.public_code)}`;
}

export function getAnnouncementUrl(announcement: AnnouncementUrlFields): string {
  return `/thong-bao/${buildAnnouncementSegment(announcement.slug, announcement.public_code)}`;
}

export function getPolicyUrl(policy: PolicyUrlFields): string {
  return `/chinh-sach/${buildPolicySegment(policy.slug, policy.public_code)}`;
}

export function getCanonicalUrl(
  entityType: PublicEntityType,
  entity:
    | StoryUrlFields
    | ChapterUrlFields
    | ReelUrlFields
    | ContentPostUrlFields
    | AnnouncementUrlFields
    | PolicyUrlFields,
  parentStory?: StoryUrlFields
): string | null {
  switch (entityType) {
    case "story":
      return getStoryUrl(entity as StoryUrlFields);
    case "chapter":
      if (!parentStory) {
        return null;
      }
      return getChapterUrl(parentStory, entity as ChapterUrlFields);
    case "reel":
      return getReelUrl(entity as ReelUrlFields);
    case "content_post":
      return getContentPostUrl(entity as ContentPostUrlFields);
    case "announcement":
      return getAnnouncementUrl(entity as AnnouncementUrlFields);
    case "policy":
      return getPolicyUrl(entity as PolicyUrlFields);
    default:
      return null;
  }
}

export function generateCanonicalPath(
  entityType: PublicEntityType,
  entity:
    | StoryUrlFields
    | ChapterUrlFields
    | ReelUrlFields
    | ContentPostUrlFields
    | AnnouncementUrlFields
    | PolicyUrlFields,
  parentStory?: StoryUrlFields
): string | null {
  return getCanonicalUrl(entityType, entity, parentStory);
}

/** Legacy slug-only paths for redirect source registration. */
export function getLegacyStoryPath(slug: string): string {
  return `/truyen/${slug}`;
}

export function getLegacyStoryEpisodePath(
  slug: string,
  episodeNumber: number | string
): string {
  return `/truyen/${slug}/chuong/${episodeNumber}`;
}

export function getLegacyStoriesPath(slug: string): string {
  return `/stories/${slug}`;
}

export function getLegacyStoriesEpisodePath(
  slug: string,
  episodeNumber: number | string
): string {
  return `/stories/${slug}/episodes/${episodeNumber}`;
}
