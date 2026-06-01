import { CampaignCenter } from "@/components/admin/campaigns/CampaignCenter";
import { ErrorState } from "@/components/ui";
import { buildCampaignStaffPermissions } from "@/lib/auth/campaign-permissions";
import { getCurrentAuthContext } from "@/lib/auth/permissions";
import { requireCampaignViewAccess } from "@/lib/auth/require-permission";
import { getMonetizationConfig } from "@/lib/monetization/config";
import {
  getCampaignCenterSettings,
  getCampaignMetricsSummary,
  getCampaignsForAdmin,
  getSponsorsWithStats
} from "@/lib/supabase/campaigns";
import { getChallenges } from "@/lib/supabase/challenges";
import { DEFAULT_CAMPAIGN_CENTER_SETTINGS } from "@/types/campaign";

export const dynamic = "force-dynamic";

export default async function AdminCampaignsPage() {
  const guard = await requireCampaignViewAccess("/admin/campaigns");
  if (!guard.ok) {
    return (
      <section className="space-y-6">
        <h1 className="text-3xl font-bold text-white">Không có quyền truy cập</h1>
        <ErrorState message={guard.error} title="Không có quyền truy cập admin" variant="danger" />
      </section>
    );
  }

  const ctx = guard.context ?? (await getCurrentAuthContext());
  const permissions = ctx ? buildCampaignStaffPermissions(ctx) : {
    canView: false,
    canCreate: false,
    canUpdate: false,
    canPause: false,
    canArchive: false,
    canViewFinance: false,
    canManageSponsors: false,
    canUpdateSettings: false
  };

  const { settings: monetizationSettings } = await getMonetizationConfig({
    includePrivate: true,
    useCache: false
  });
  const sponsorshipEnabled =
    Boolean(monetizationSettings["monetization.enabled"]) &&
    (Boolean(monetizationSettings["sponsored_challenge.enabled"]) ||
      Boolean(monetizationSettings["brand_campaigns.enabled"]));

  const [campaignsResult, settingsResult, metricsResult, challenges] = await Promise.all([
    getCampaignsForAdmin(),
    getCampaignCenterSettings(),
    getCampaignMetricsSummary(),
    getChallenges()
  ]);

  const sponsorsResult = await getSponsorsWithStats(
    campaignsResult.data.map((c) => c)
  );

  const loadError =
    sponsorsResult.error ?? campaignsResult.error ?? settingsResult.error ?? metricsResult.error;

  if (loadError) {
    return (
      <section className="space-y-6">
        <ErrorState message={loadError} title="Lỗi dữ liệu chiến dịch" />
      </section>
    );
  }

  return (
    <CampaignCenter
      campaigns={campaignsResult.data}
      challenges={challenges}
      metrics={metricsResult.data}
      permissions={permissions}
      settings={settingsResult.data ?? DEFAULT_CAMPAIGN_CENTER_SETTINGS}
      sponsors={sponsorsResult.data}
      sponsorshipEnabled={sponsorshipEnabled}
    />
  );
}
