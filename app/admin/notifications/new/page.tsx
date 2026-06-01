import Link from "next/link";
import { CampaignForm } from "@/components/admin/notification-campaigns/CampaignForm";
import { ErrorState } from "@/components/ui";
import { buildAdminNotificationCampaignCapabilities } from "@/types/admin-notification-campaigns";
import { requireAnyPermission } from "@/lib/auth/require-permission";

export const dynamic = "force-dynamic";

export default async function AdminNotificationCreateRoute() {
  const guard = await requireAnyPermission(
    ["notification.campaign.create", "admin.dashboard.view"],
    { returnTo: "/admin/notifications/new" }
  );

  if (!guard.ok) {
    return <ErrorState message={guard.error} title="Không có quyền truy cập" variant="danger" />;
  }

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
        <h1 className="text-2xl font-semibold text-white">Tạo notification campaign</h1>
      </header>
      <CampaignForm capabilities={capabilities} mode="create" />
    </section>
  );
}
