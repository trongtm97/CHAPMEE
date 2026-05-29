"use client";

import { MeActivitiesSkeleton } from "@/components/me/MeActivitiesSkeleton";
import { useMeActivities } from "@/components/me/me-activities-context";
import { PersonalActivityTimeline } from "@/components/me/PersonalActivityTimeline";
import { ErrorState } from "@/components/ui";

export function MeDesktopActivitySection() {
  const { activities, error, loading, refresh } = useMeActivities();

  if (loading && activities.length === 0) {
    return <MeActivitiesSkeleton count={4} />;
  }

  if (error && activities.length === 0) {
    return (
      <ErrorState
        action={
          <button
            className="tap-highlight rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-zinc-200"
            onClick={() => {
              void refresh();
            }}
            type="button"
          >
            Thử lại
          </button>
        }
        message={error}
        title="Không tải được hoạt động"
      />
    );
  }

  if (activities.length === 0) {
    return null;
  }

  return <PersonalActivityTimeline items={activities} maxItems={6} variant="full" />;
}
