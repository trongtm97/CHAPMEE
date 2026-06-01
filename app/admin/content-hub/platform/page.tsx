import { AdminContentHubPlatformPage } from "@/components/admin/content-hub/platform/AdminContentHubPlatformPage";
import { ErrorState } from "@/components/ui";
import { loadSeoDashboardAction } from "@/lib/admin/seo-actions";
import {
  getNotificationCampaignStatsForAdminAction,
  listNotificationCampaignsForAdminAction
} from "@/lib/admin/notification-campaign-list-action";
import { listSeoAuditLogs } from "@/lib/platform-content/notification-campaigns";
import { parseNotificationCampaignListFilters } from "@/lib/platform-content/parse-notification-campaign-filters";
import { requireAnyPermission } from "@/lib/auth/require-permission";
import { buildAdminNotificationCampaignCapabilities } from "@/types/admin-notification-campaigns";
import { buildAdminSeoCapabilities } from "@/types/admin-seo";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminContentHubPlatformRoute({ searchParams }: PageProps) {
  const guard = await requireAnyPermission(
    ["notification.campaign.view", "seo.rule.view", "admin.dashboard.view"],
    { returnTo: "/admin/content-hub/platform" }
  );

  if (!guard.ok) {
    return <ErrorState message={guard.error} title="Không có quyền truy cập" variant="danger" />;
  }

  const query = await searchParams;
  const tab = query.tab === "seo" ? "seo" : "campaigns";
  const campaignFilters = parseNotificationCampaignListFilters(query);
  const campaignCapabilities = buildAdminNotificationCampaignCapabilities(guard.context.permissions);
  const seoCapabilities = buildAdminSeoCapabilities(guard.context.permissions);

  const [campaignList, campaignStatsResult, seoDashboard, auditResult] = await Promise.all([
    listNotificationCampaignsForAdminAction(campaignFilters),
    getNotificationCampaignStatsForAdminAction(),
    loadSeoDashboardAction(),
    listSeoAuditLogs(50)
  ]);

  const loadError =
    campaignList.error ??
    campaignStatsResult.error ??
    seoDashboard.error ??
    auditResult.error ??
    null;

  return (
    <section>
      <AdminContentHubPlatformPage
        campaignCapabilities={campaignCapabilities}
        campaignFilters={campaignFilters}
        campaignStats={campaignStatsResult.stats ?? {
          total: 0,
          draft: 0,
          scheduled: 0,
          sending: 0,
          sent: 0,
          paused: 0,
          failed: 0,
          cancelled: 0,
          archived: 0,
          avgOpenRate: 0,
          latestEstimatedRecipients: 0
        }}
        campaignTotal={campaignList.total}
        campaigns={campaignList.items}
        initialTab={tab}
        loadError={loadError}
        seoAuditLogs={auditResult.items}
        seoCapabilities={seoCapabilities}
        seoData={seoDashboard}
      />
    </section>
  );
}
