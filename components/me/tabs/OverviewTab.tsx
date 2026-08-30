"use client";

import { AchievementPreview } from "@/components/me/AchievementPreview";
import { ContinueListeningAudioSection } from "@/components/me/ContinueListeningAudioSection";
import { ContinueReadingSection } from "@/components/me/ContinueReadingSection";
import { CreatorStudioCard } from "@/components/me/CreatorStudioCard";
import { MeActivitiesSkeleton } from "@/components/me/MeActivitiesSkeleton";
import { MeFeedbackCard } from "@/components/me/MeFeedbackCard";
import { MeQuickSettings } from "@/components/me/MeQuickSettings";
import { useMeActivities } from "@/components/me/me-activities-context";
import { PersonalActivityTimeline } from "@/components/me/PersonalActivityTimeline";
import type { MePageData } from "@/types/me-page";

type OverviewTabProps = {
  data: MePageData;
};

export function OverviewTab({ data }: OverviewTabProps) {
  const { activities, loading: activitiesLoading } = useMeActivities();

  return (
    <div className="space-y-3">
      <ContinueReadingSection
        compact
        items={data.currentlyReading}
        maxItems={3}
        variant="hero"
      />

      <ContinueListeningAudioSection
        compact
        items={data.continueListeningAudio}
        maxItems={3}
      />

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
          maxItems={2}
          viewAllHref="/me?tab=activity"
        />
      ) : null}

      <AchievementPreview items={data.achievementPreview} maxItems={3} />

      <MeFeedbackCard settings={data.contactSettings} userEmail={data.user.email} />

      <MeQuickSettings
        compact
        publicProfilePath={data.publicProfilePath}
        unreadNotificationCount={data.unreadNotificationCount}
      />
    </div>
  );
}
