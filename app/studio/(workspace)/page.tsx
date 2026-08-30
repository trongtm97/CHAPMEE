import type { Metadata } from "next";
import { StudioDashboard } from "@/components/studio/StudioDashboard";
import { CreatorStudioCampaignCard } from "@/components/campaigns/CreatorStudioCampaignCard";
import { PageViewTracker } from "@/components/analytics/PageViewTracker";
import { ErrorState } from "@/components/ui";
import { analyticsEvents } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/trackEvent";
import { getCreatorStudioDashboard } from "@/lib/creator/get-creator-dashboard";
import { loadCreatorStudioCampaign } from "@/lib/campaigns/load-public-campaigns";
import { getStudioAccess } from "@/lib/creator/getStudioAccess";
import { buildCanonicalUrl } from "@/lib/seo/metadata";
import { STUDIO_BASE_PATH, STUDIO_FULL_NAME } from "@/lib/studio/constants";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: `${STUDIO_FULL_NAME} — Tổng quan Studio`,
    description:
      "Tổng quan Studio: viết tiếp, nháp, lịch đăng và hiệu quả truyện trên ChapMee.",
    alternates: { canonical: buildCanonicalUrl(STUDIO_BASE_PATH) }
  };
}

export default async function StudioOverviewPage() {
  const { creatorProfile, error } = await getStudioAccess(STUDIO_BASE_PATH);

  if (error || !creatorProfile) {
    return (
      <section className="space-y-6 px-1">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">
          {STUDIO_FULL_NAME}
        </p>
        <ErrorState message={error} title="Không tải được hồ sơ tác giả" />
      </section>
    );
  }

  const [dashboard, creatorCampaign] = await Promise.all([
    getCreatorStudioDashboard(creatorProfile),
    loadCreatorStudioCampaign().catch(() => null)
  ]);

  void trackEvent({
    eventName: analyticsEvents.creatorDashboardViewed,
    targetId: creatorProfile.id,
    targetType: "creator",
    metadata: { creator_id: creatorProfile.id, surface: "studio" }
  }).catch(() => undefined);

  return (
    <section className="w-full min-w-0">
      <PageViewTracker
        eventName={analyticsEvents.creatorDashboardViewed}
        pageLabel="studio_overview"
        targetId={creatorProfile.id}
        targetType="creator"
      />
      {creatorCampaign ? (
        <div className="mb-6">
          <CreatorStudioCampaignCard campaign={creatorCampaign} />
        </div>
      ) : null}
      <StudioDashboard
        basePath={STUDIO_BASE_PATH}
        creatorProfile={creatorProfile}
        data={dashboard}
      />
    </section>
  );
}
