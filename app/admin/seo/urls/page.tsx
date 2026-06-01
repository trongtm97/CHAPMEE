import { AdminUrlRedirectsPanel } from "@/components/admin/seo/AdminUrlRedirectsPanel";
import { ErrorState } from "@/components/ui";
import { loadUrlAdminDashboard } from "@/lib/admin/url-seo-data";
import { requireAnyPermission } from "@/lib/auth/require-permission";

export const dynamic = "force-dynamic";

export default async function AdminSeoUrlsPage() {
  const guard = await requireAnyPermission(
    ["seo.rule.view", "seo.audit.view", "admin.dashboard.view"],
    { returnTo: "/admin/seo/urls" }
  );

  if (!guard.ok) {
    return <ErrorState message={guard.error} title="Không có quyền truy cập" variant="danger" />;
  }

  const data = await loadUrlAdminDashboard();

  if (data.error) {
    return <ErrorState message={data.error} title="Không tải được dữ liệu URL" variant="danger" />;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">URL & Redirects</h1>
        <p className="text-sm text-muted-foreground">
          Canonical URLs, redirect history, slug changes và cảnh báo loop.
        </p>
      </div>
      <AdminUrlRedirectsPanel initialData={data} />
    </div>
  );
}
