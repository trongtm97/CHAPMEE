import { SeoCenterDashboard } from "@/components/admin/seo/SeoCenterDashboard";
import { ErrorState } from "@/components/ui";
import { countSeoOverrides } from "@/lib/seo/seo-admin-service";
import { requireAnyPermission } from "@/lib/auth/require-permission";
import { buildAdminSeoCapabilities } from "@/types/admin-seo";

export const dynamic = "force-dynamic";

export default async function AdminSeoCenterDashboardPage() {
  const guard = await requireAnyPermission(
    ["seo.rule.view", "seo.audit.view", "admin.dashboard.view"],
    { returnTo: "/admin/seo" }
  );

  if (!guard.ok) {
    return <ErrorState message={guard.error} title="Không có quyền truy cập" variant="danger" />;
  }

  const capabilities = buildAdminSeoCapabilities(guard.context.permissions);

  if (!capabilities.canViewRules && !capabilities.canViewAudit) {
    return <ErrorState message="Bạn không có quyền xem SEO Center." title="Không có quyền" variant="danger" />;
  }

  const overrideCount = await countSeoOverrides();

  return <SeoCenterDashboard overrideCount={overrideCount} />;
}
