"use client";

import { AchievementPreview } from "@/components/me/AchievementPreview";
import { CombinedEmptyState } from "@/components/me/CombinedEmptyState";
import { ContinueReadingSection } from "@/components/me/ContinueReadingSection";
import { CreatorStudioCard } from "@/components/me/CreatorStudioCard";
import { MeActivitiesSkeleton } from "@/components/me/MeActivitiesSkeleton";
import { useMeActivities } from "@/components/me/me-activities-context";
import { PersonalActivityTimeline } from "@/components/me/PersonalActivityTimeline";
import { ContactFeedbackCard } from "@/components/me/ContactFeedbackCard";
import { MeProfileCoinBalance } from "@/components/me/MeProfileCoinBalance";
import { SettingsQuickCard } from "@/components/me/SettingsQuickCard";
import type { MePageData } from "@/types/me-page";
import type { PersonalActivityItem } from "@/types/me-page";

type OverviewTabProps = {
  data: MePageData;
};

function hasOverviewContent(
  data: MePageData,
  activities: PersonalActivityItem[],
  activitiesLoading: boolean
) {
  return (
    data.currentlyReading.length > 0 ||
    (!activitiesLoading && activities.length > 0) ||
    data.achievementPreview.length > 0 ||
    Boolean(data.creatorProfile)
  );
}

export function OverviewTab({ data }: OverviewTabProps) {
  const { activities, loading: activitiesLoading } = useMeActivities();
  const showCombinedEmpty = !hasOverviewContent(data, activities, activitiesLoading);

  return (
    <div className="space-y-3">
      {showCombinedEmpty ? <CombinedEmptyState /> : null}

      {data.currentlyReading.length > 0 ? (
        <ContinueReadingSection
          compact
          items={data.currentlyReading}
          maxItems={2}
          variant="hero"
        />
      ) : null}

      <CreatorStudioCard
        compact
        creatorProfile={data.creatorProfile}
        stats={data.creatorStats}
      />

      {activitiesLoading && activities.length === 0 ? (
        <MeActivitiesSkeleton count={2} />
      ) : activities.length > 0 ? (
        <PersonalActivityTimeline
          items={activities}
          maxItems={3}
          viewAllHref="/me?tab=activity"
        />
      ) : null}

      <AchievementPreview items={data.achievementPreview} maxItems={2} />

      <ContactFeedbackCard
        settings={data.contactSettings}
        userEmail={data.user.email}
      />

      <MeProfileCoinBalance showCoinWallet={data.monetization.showCoinWallet}>
        {(coinBalance) => (
          <SettingsQuickCard
            coinBalance={coinBalance}
            coinDisplayName={data.monetization.coinDisplayName}
            unreadNotificationCount={data.unreadNotificationCount}
          />
        )}
      </MeProfileCoinBalance>
    </div>
  );
}
