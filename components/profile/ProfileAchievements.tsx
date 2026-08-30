import { BadgeCard as EarnedBadgeCard } from "@/components/badges/BadgeCard";
import { BadgeCard as AchievementCard } from "@/components/profile/BadgeCard";
import { ProfileEmptyState } from "@/components/profile/ProfileEmptyState";
import type { BadgeViewItem } from "@/types/badge";
import type { MilestoneViewItem } from "@/types/milestone";
import type { ProfileAchievement } from "@/types/profile";

type ProfileAchievementsProps = {
  achievements: ProfileAchievement[];
  badgeItems: BadgeViewItem[];
  milestones: MilestoneViewItem[];
  isOwner: boolean;
};

export function ProfileAchievements({
  achievements,
  badgeItems,
  isOwner,
  milestones
}: ProfileAchievementsProps) {
  const visibleAchievements = isOwner
    ? achievements
    : achievements.filter((item) => item.status === "unlocked");

  const hasContent =
    visibleAchievements.length > 0 || badgeItems.length > 0 || milestones.length > 0;

  if (!hasContent) {
    return (
      <ProfileEmptyState
        compact
        description="Tiếp tục sáng tác và tương tác để mở khóa thành tích đầu tiên."
        title="Chưa có thành tích công khai"
      />
    );
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-base font-bold text-white">
          {isOwner ? "Thành tích của bạn" : "Thành tích"}
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          {isOwner
            ? "Huy hiệu và cột mốc — chỉ bạn thấy mục chưa mở khóa."
            : "Chỉ hiển thị thành tích đã mở khóa công khai."}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {visibleAchievements.map((achievement) => (
          <AchievementCard
            allowShare={isOwner}
            badge={achievement}
            key={achievement.id}
          />
        ))}
        {badgeItems.map((badge) => (
          <EarnedBadgeCard badge={badge} key={`badge-${badge.id}`} />
        ))}
      </div>

      {milestones.length > 0 ? (
        <ul className="space-y-2 rounded-xl border border-white/10 bg-white/[0.02] p-3">
          {milestones.map((milestone) => (
            <li className="text-sm text-zinc-300" key={milestone.id}>
              <span className="font-semibold text-white">{milestone.title}</span>
              {milestone.description ? (
                <span className="text-zinc-400"> — {milestone.description}</span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
