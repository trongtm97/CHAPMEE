import Link from "next/link";
import { BadgeList } from "@/components/badges";
import { CombinedEmptyState } from "@/components/me/CombinedEmptyState";
import { MilestoneSection } from "@/components/milestones/MilestoneSection";
import { TopFansSection } from "@/components/fans";
import { Badge, SectionHeader } from "@/components/ui";
import type { MePageData } from "@/types/me-page";
import type { ProfileAchievement } from "@/types/profile";

type AchievementsTabProps = {
  data: MePageData;
};

function hasAchievementContent(data: MePageData) {
  return (
    data.readerProfile.badgeItems.length > 0 ||
    data.readerProfile.milestones.length > 0 ||
    data.readerProfile.topFanHighlights.length > 0 ||
    data.readerProfile.achievements.some((item) => item.status !== "unavailable")
  );
}

function CompactLockedBadge({ badge }: { badge: ProfileAchievement }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-white/6 bg-white/[0.02] px-3 py-2">
      <span aria-hidden="true" className="text-xs opacity-50">
        🔒
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-zinc-300">{badge.title}</p>
        {badge.value ? (
          <p className="text-[0.65rem] text-zinc-600">{badge.value}</p>
        ) : null}
      </div>
      <Badge variant="warning">Gần mở</Badge>
    </div>
  );
}

export function AchievementsTab({ data }: AchievementsTabProps) {
  const unlockedAchievements = data.readerProfile.achievements.filter(
    (item) => item.status === "unlocked"
  );
  const nearAchievements = data.readerProfile.achievements.filter(
    (item) => item.status === "locked"
  );
  const upcomingAchievements = data.readerProfile.achievements.filter(
    (item) => item.status === "unavailable"
  );

  if (!hasAchievementContent(data)) {
    return (
      <CombinedEmptyState
        description="Đọc đều, lưu truyện và tương tác để mở badge đầu tiên."
        title="Bạn chưa có thành tích nào."
      />
    );
  }

  return (
    <div className="space-y-4">
      {data.readerProfile.badgeItems.length > 0 ? (
        <BadgeList
          emptyDescription=""
          emptyTitle=""
          items={data.readerProfile.badgeItems}
          maxVisible={6}
          seeAllLabel="Xem thêm"
          subtitle="Badge đã mở khóa trên ChapMee."
          title="Đã mở"
        />
      ) : null}

      {nearAchievements.length > 0 ? (
        <section className="space-y-2">
          <SectionHeader title="Gần mở" />
          <div className="space-y-1.5">
            {nearAchievements.slice(0, 4).map((achievement) => (
              <CompactLockedBadge badge={achievement} key={achievement.id} />
            ))}
          </div>
        </section>
      ) : null}

      {data.readerProfile.milestones.length > 0 ? (
        <MilestoneSection
          emptyDescription=""
          emptyTitle=""
          id="milestones"
          items={data.readerProfile.milestones}
          subtitle="Những cột mốc đáng nhớ trên hành trình đọc."
          title="Cột mốc đọc"
        />
      ) : null}

      {data.readerProfile.topFanHighlights.length > 0 ? (
        <TopFansSection
          challengeTip=""
          currentUserTip="Bạn đang là Top Fan #{rank}."
          emptyDescription=""
          emptyTitle=""
          items={data.readerProfile.topFanHighlights}
          subtitle="Danh hiệu Top Fan bạn đang giữ."
          title="Fan badge"
        />
      ) : null}

      {unlockedAchievements.length > 0 ? (
        <section className="space-y-2">
          <SectionHeader title="Thành tích đã mở" />
          <div className="flex flex-wrap gap-2">
            {unlockedAchievements.map((achievement) => (
              <span
                className="chap-pill px-3 py-1.5 text-xs font-semibold text-zinc-100"
                key={achievement.id}
              >
                {achievement.title}
                {achievement.value ? ` · ${achievement.value}` : ""}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      {upcomingAchievements.length > 0 ? (
        <section className="space-y-2">
          <SectionHeader title="Sắp có" />
          <div className="flex flex-wrap gap-2">
            {upcomingAchievements.map((achievement) => (
              <span
                className="rounded-full border border-white/8 px-2.5 py-1 text-[0.68rem] text-zinc-500"
                key={achievement.id}
              >
                {achievement.title}
              </span>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
