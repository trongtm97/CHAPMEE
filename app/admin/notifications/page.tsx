import { AdminNotificationCampaignsPage } from "@/components/admin/notification-campaigns/AdminNotificationCampaignsPage";
import { ErrorState } from "@/components/ui";
import { listNotificationCampaigns } from "@/lib/platform-content/notification-campaigns";
import { getNotificationCampaignStats } from "@/lib/platform-content/notification-campaigns";
import { parseNotificationCampaignListFilters } from "@/lib/platform-content/parse-notification-campaign-filters";
import { requireAnyPermission } from "@/lib/auth/require-permission";
import { buildAdminNotificationCampaignCapabilities } from "@/types/admin-notification-campaigns";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminNotificationsRoute({ searchParams }: PageProps) {
  const guard = await requireAnyPermission(
    ["notification.campaign.view", "admin.dashboard.view"],
    { returnTo: "/admin/notifications" }
  );

  if (!guard.ok) {
    return <ErrorState message={guard.error} title="Không có quyền truy cập" variant="danger" />;
  }

  const query = await searchParams;
  const filters = parseNotificationCampaignListFilters(query);
  const capabilities = buildAdminNotificationCampaignCapabilities(guard.context.permissions);
  const listResult = await listNotificationCampaigns(filters);
  const statsResult = await getNotificationCampaignStats();

  return (
    <section>
      <AdminNotificationCampaignsPage
        capabilities={capabilities}
        initialFilters={filters}
        initialItems={listResult.items}
        initialTotal={listResult.total}
        initialStats={statsResult.stats}
        loadError={listResult.error}
      />
    </section>
  );
}
