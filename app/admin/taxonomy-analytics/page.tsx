import { TaxonomyAnalyticsDashboard } from "@/components/admin/taxonomy-analytics/TaxonomyAnalyticsDashboard";
import { ErrorState } from "@/components/ui";
import { getTaxonomyAnalyticsPageData } from "@/lib/admin/get-taxonomy-analytics-page-data";
import { TAXONOMY_PERMISSION_FALLBACK } from "@/lib/admin/taxonomy-permissions";
import { requireAnyPermission } from "@/lib/auth/require-permission";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminTaxonomyAnalyticsPage({ searchParams }: PageProps) {
  const guard = await requireAnyPermission(
    [
      "taxonomy.view",
      ...TAXONOMY_PERMISSION_FALLBACK.view,
      "admin.settings.update"
    ],
    { returnTo: "/admin/taxonomy-analytics" }
  );

  if (!guard.ok) {
    return (
      <ErrorState message={guard.error} title="Không có quyền truy cập" variant="danger" />
    );
  }

  const query = await searchParams;
  const data = await getTaxonomyAnalyticsPageData(query);
  const permissions = guard.context.permissions;
  const capabilities = {
    canExport:
      permissions.includes("taxonomy.export") || permissions.includes("admin.settings.update"),
    canRebuild: permissions.includes("admin.settings.update"),
    canManageSeo:
      permissions.includes("seo.rule.update") || permissions.includes("admin.settings.update"),
    canManageAlgorithm: permissions.includes("admin.settings.update")
  };

  return (
    <section className="space-y-6">
      <div>
        <nav className="text-sm text-zinc-400" aria-label="Breadcrumb">
          <span>Admin</span>
          <span className="mx-2">/</span>
          <span>Taxonomy</span>
          <span className="mx-2">/</span>
          <span className="text-zinc-200">Phân tích</span>
        </nav>

        <h1 className="mt-3 text-3xl font-bold tracking-normal">Phân tích taxonomy</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
          Theo dõi cung/cầu nội dung, hiệu quả đọc, SEO, doanh thu và mức độ công bằng theo từng nhóm taxonomy.
        </p>
      </div>

      {data.error ? (
        <ErrorState message={data.error} title="Không tải được phân tích taxonomy" />
      ) : null}

      <TaxonomyAnalyticsDashboard capabilities={capabilities} data={data} />
    </section>
  );
}
