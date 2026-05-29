import type { ReaderProfileData } from "@/lib/profile/getReaderProfile";
import type { AchievementPreviewItem } from "@/types/me-page";

export function buildAchievementPreview(
  readerProfile: ReaderProfileData,
  limit = 3
): AchievementPreviewItem[] {
  const unlockedFromBadges = readerProfile.badgeItems.slice(0, 2).map((badge) => ({
    id: badge.id,
    title: badge.definition.name,
    description: badge.definition.description,
    status: "unlocked" as const,
    value: badge.awardedAt ? "Đã mở" : undefined
  }));

  const unlockedAchievements = readerProfile.achievements
    .filter((item) => item.status === "unlocked")
    .slice(0, 2)
    .map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      status: "unlocked" as const,
      value: item.value
    }));

  const nearUnlock = readerProfile.achievements
    .filter((item) => item.status === "locked")
    .slice(0, 2)
    .map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      status: "near" as const,
      progress:
        item.id === "saved-stories"
          ? { current: readerProfile.metrics.savedStoriesCount, target: 1 }
          : item.id === "followed-authors"
            ? { current: readerProfile.metrics.followingAuthorsCount, target: 1 }
            : undefined,
      value: item.value
    }));

  const combined = [...unlockedFromBadges, ...unlockedAchievements, ...nearUnlock];
  const seen = new Set<string>();

  return combined
    .filter((item) => {
      if (seen.has(item.id)) {
        return false;
      }
      seen.add(item.id);
      return true;
    })
    .slice(0, limit);
}
