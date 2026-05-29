import type { NotificationItem } from "@/types/notification";

export function getNotificationActionUrl(item: NotificationItem): string {
  if (item.action_url?.startsWith("/")) {
    return item.action_url;
  }

  const meta = item.metadata ?? {};
  const storySlug = typeof meta.story_slug === "string" ? meta.story_slug : null;
  const chapterNumber =
    typeof meta.chapter_number === "number" ? meta.chapter_number : null;

  if (storySlug && chapterNumber) {
    return `/stories/${storySlug}/episodes/${chapterNumber}`;
  }

  if (storySlug) {
    return `/stories/${storySlug}`;
  }

  switch (item.target_type) {
    case "wallet":
    case "transaction":
      return "/wallet";
    case "chapter":
      return storySlug ? `/stories/${storySlug}` : "/discover";
    case "story":
      return storySlug ? `/stories/${storySlug}` : "/discover";
    case "comment":
    case "community_post":
      return "/community";
    case "author":
      return "/studio";
    case "profile":
      if (item.action_url?.startsWith("/")) {
        return item.action_url;
      }
      return "/me";
    default:
      if (item.type === "new_message" || item.type === "message_request_accepted") {
        return item.action_url ?? "/messages";
      }
      if (item.type === "new_message_request") {
        return "/messages?tab=requests";
      }
      return "/discover";
  }
}
