import type { BadgeViewItem } from "@/types/badge";
import type { MilestoneViewItem } from "@/types/milestone";
import type { ProfileAchievement } from "@/types/profile";

/** Chỉ thành tích đã mở khóa được phép hiển thị với người xem khác. */
export function filterAchievementsForProfileViewer(
  achievements: ProfileAchievement[],
  isOwner: boolean
): ProfileAchievement[] {
  if (isOwner) {
    return achievements;
  }
  return achievements.filter((item) => item.status === "unlocked");
}

export function hasPublicAchievementContent(input: {
  achievements: ProfileAchievement[];
  badgeItems: BadgeViewItem[];
  milestones: MilestoneViewItem[];
  isOwner: boolean;
}): boolean {
  if (input.isOwner) {
    return true;
  }
  return (
    filterAchievementsForProfileViewer(input.achievements, false).length > 0 ||
    input.badgeItems.length > 0 ||
    input.milestones.length > 0
  );
}
