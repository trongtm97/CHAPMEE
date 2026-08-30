import { SeoAuditDashboard } from "@/components/admin/seo/SeoAuditDashboard";
import { ErrorState } from "@/components/ui";
import { requireAnyPermission } from "@/lib/auth/require-permission";
import { listRecentSeoAuditResults } from "@/lib/seo/seo-audit-service";
import { buildAdminSeoCapabilities } from "@/types/admin-seo";

export const dynamic = "force-dynamic";

export default async function AdminSeoAuditPage() {
  const guard = await requireAnyPermission(
    ["seo.rule.view", "seo.audit.view", "admin.dashboard.view"],
    { returnTo: "/admin/seo/audit" }
  );

  if (!guard.ok) {
    return <ErrorState message={guard.error} title="Không có quyền truy cập" variant="danger" />;
  }

  const capabilities = buildAdminSeoCapabilities(guard.context.permissions);
  const initialItems = await listRecentSeoAuditResults(50);

  return <SeoAuditDashboard capabilities={capabilities} initialItems={initialItems} />;
}
