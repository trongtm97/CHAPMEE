import Link from "next/link";
import { notFound } from "next/navigation";
import { CampaignAuditLog } from "@/components/admin/notification-campaigns/CampaignAuditLog";
import { CampaignDetailPanel } from "@/components/admin/notification-campaigns/CampaignDetailPanel";
import { CampaignForm } from "@/components/admin/notification-campaigns/CampaignForm";
import { ErrorState } from "@/components/ui";
import {
  attachCampaignDeliveryStats,
  getNotificationCampaignById
} from "@/lib/platform-content/notification-campaigns";import { requireAnyPermission } from "@/lib/auth/require-permission";
import { buildAdminNotificationCampaignCapabilities } from "@/types/admin-notification-campaigns";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminNotificationDetailRoute({ params }: PageProps) {
  const guard = await requireAnyPermission(
    ["notification.campaign.view", "admin.dashboard.view"],
    { returnTo: "/admin/notifications" }
  );

  if (!guard.ok) {
    return <ErrorState message={guard.error} title="Không có quyền truy cập" variant="danger" />;
  }

  const { id } = await params;
  const result = await getNotificationCampaignById(id);

  if (result.error) {
    return <ErrorState message={result.error} title="Không thể tải campaign" variant="danger" />;
  }

  if (!result.item) {
    notFound();
  }

  const [campaign] = await attachCampaignDeliveryStats([result.item]);
  const capabilities = buildAdminNotificationCampaignCapabilities(guard.context.permissions);

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <Link
          className="text-sm text-zinc-400 transition hover:text-zinc-200"
          href="/admin/notifications"
        >
          ← Quay lại danh sách
        </Link>
        <h1 className="text-2xl font-semibold text-white">
          {campaign.name ?? campaign.title}
        </h1>
        <p className="text-sm text-zinc-400">Chi tiết chiến dịch thông báo</p>
      </header>

      <CampaignDetailPanel campaign={campaign} />
      <CampaignForm campaign={campaign} capabilities={capabilities} mode="edit" />

      <div id="audit">
        {capabilities.canAuditView ? <CampaignAuditLog campaignId={campaign.id} /> : null}
      </div>
    </section>
  );
}
