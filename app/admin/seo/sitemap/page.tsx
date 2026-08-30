import { SeoSitemapSettingsForm } from "@/components/admin/seo/SeoSitemapSettingsForm";
import { ErrorState } from "@/components/ui";
import { loadSeoSitemapSettingsAction } from "@/lib/admin/seo-sitemap-actions";
import { requireAnyPermission } from "@/lib/auth/require-permission";
import { listSitemapChildDescriptors, segmentLabel } from "@/lib/seo/sitemap-children";
import { buildAdminSeoCapabilities } from "@/types/admin-seo";

export const dynamic = "force-dynamic";

export default async function AdminSeoSitemapPage() {
  const guard = await requireAnyPermission(
    ["seo.rule.view", "seo.audit.view", "admin.dashboard.view"],
    { returnTo: "/admin/seo/sitemap" }
  );

  if (!guard.ok) {
    return <ErrorState message={guard.error} title="Không có quyền truy cập" variant="danger" />;
  }

  const capabilities = buildAdminSeoCapabilities(guard.context.permissions);
  const [result, sitemapChildren] = await Promise.all([
    loadSeoSitemapSettingsAction(),
    listSitemapChildDescriptors()
  ]);

  if (!result.ok || !result.settings) {
    return (
      <ErrorState
        message={result.error ?? "Không tải được cài đặt sitemap."}
        title="Lỗi"
        variant="danger"
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Sitemap & Robots</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Quản lý robots.txt, sitemap index và segment toggles — không đưa trang private vào
          sitemap.
        </p>
      </div>

      <SeoSitemapSettingsForm
        canUpdate={capabilities.canUpdateRules}
        initialSettings={result.settings}
        sitemapChildren={sitemapChildren.map((child) => ({
          estimatedUrlCount: child.estimatedUrlCount,
          id: child.id,
          label: segmentLabel(child.segment),
          page: child.page,
          path: child.path
        }))}
      />
    </div>
  );
}
