import type { ReelsItem } from "@/lib/reels/getReelsItems";
import type { TrackingContextFields, TrackingItemType } from "@/types/tracking";

export function resolveReelsTrackingContext(item: ReelsItem): TrackingContextFields {
  if (item.kind === "manual") {
    return {
      itemType: "reel",
      itemId: item.id,
      chapterId: item.chapterId,
      reelId: item.id,
      storyId: item.storyId,
      authorUserId: item.creatorUserId
    };
  }

  return {
    itemType: "chapter",
    itemId: item.id,
    chapterId: item.chapterId ?? item.id,
    storyId: item.storyId,
    authorUserId: item.creatorUserId
  };
}

export function mapReportTargetToTrackingItemType(
  targetType: string
): TrackingItemType {
  switch (targetType) {
    case "story":
      return "story";
    case "chapter":
      return "chapter";
    case "user":
    case "creator":
      return "author_profile";
    case "community_post":
      return "community_post";
    default:
      return "story";
  }
}
