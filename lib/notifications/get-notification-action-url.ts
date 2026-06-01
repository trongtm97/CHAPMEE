import { sanitizeUserNotificationHref } from "@/lib/platform-content/campaign-href";
import { getChapterUrl, getStoryUrl } from "@/lib/urls/paths";
import type { NotificationItem } from "@/types/notification";

export function getSafeNotificationHref(item: NotificationItem): string | null {
  return sanitizeUserNotificationHref(item.action_url);
}

export function getNotificationNavigateUrl(item: NotificationItem): string | null {
  const direct = getSafeNotificationHref(item);
  if (direct) {
    return direct;
  }

  const meta = item.metadata ?? {};
  const storySlug = typeof meta.story_slug === "string" ? meta.story_slug : null;
  const storyPublicCode =
    typeof meta.story_public_code === "string" ? meta.story_public_code : null;
  const chapterSlug = typeof meta.chapter_slug === "string" ? meta.chapter_slug : null;
  const chapterPublicCode =
    typeof meta.chapter_public_code === "string" ? meta.chapter_public_code : null;
  const chapterNumber =
    typeof meta.chapter_number === "number" ? meta.chapter_number : null;

  if (storySlug && storyPublicCode && chapterSlug && chapterPublicCode) {
    return getChapterUrl(
      { slug: storySlug, public_code: storyPublicCode },
      { slug: chapterSlug, public_code: chapterPublicCode }
    );
  }

  if (storySlug && storyPublicCode) {
    return getStoryUrl({ slug: storySlug, public_code: storyPublicCode });
  }

  if (storySlug && chapterNumber) {
    return `/truyen/${storySlug}/chuong/${chapterNumber}`;
  }

  if (storySlug) {
    return `/truyen/${storySlug}`;
  }

  switch (item.target_type) {
    case "wallet":
    case "transaction":
      return "/wallet";
    case "comment":
    case "community_post":
      return "/community";
    case "author":
      return "/studio";
    default:
      if (item.type === "new_message" || item.type === "message_request_accepted") {
        const href = getSafeNotificationHref(item);
        return href ?? "/messages";
      }
      if (item.type === "new_message_request") {
        return "/messages?tab=requests";
      }
      return null;
  }
}
