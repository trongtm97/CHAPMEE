import { AdminTaxonomyCenter } from "@/components/admin/taxonomy/AdminTaxonomyCenter";
import { ErrorState } from "@/components/ui";
import { getTaxonomyImportExportPermissionsAction } from "@/lib/admin/taxonomy-import-export-actions";
import {
  getCatalogQualityForAdmin,
  getTaxonomyAdminDashboardStats,
  listTaxonomyAuditLogsForAdmin,
  listTaxonomyRequestsForAdmin
} from "@/lib/taxonomy/admin-data";
import { listTaxonomyImportExportJobs } from "@/lib/taxonomy/import-export/jobs";
import { TAXONOMY_PERMISSION_FALLBACK } from "@/lib/admin/taxonomy-permissions";
import { requireAnyPermission } from "@/lib/auth/require-permission";
import {
  legacyTabDefaultGroup,
  parseTaxonomyAdminTab,
  parseTaxonomyGroupFilter
} from "@/lib/taxonomy/admin-tabs";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminTaxonomyRoute({ searchParams }: PageProps) {
  const guard = await requireAnyPermission(
    [
      "taxonomy.view",
      ...TAXONOMY_PERMISSION_FALLBACK.view,
      "admin.settings.update"
    ],
    { returnTo: "/admin/taxonomy" }
  );

  if (!guard.ok) {
    return (
      <ErrorState message={guard.error} title="Không có quyền truy cập" variant="danger" />
    );
  }

  const query = await searchParams;
  const tabRaw = typeof query.tab === "string" ? query.tab : undefined;
  const tab = parseTaxonomyAdminTab(tabRaw);
  const group =
    parseTaxonomyGroupFilter(typeof query.group === "string" ? query.group : undefined) !==
    "all"
      ? parseTaxonomyGroupFilter(typeof query.group === "string" ? query.group : undefined)
      : legacyTabDefaultGroup(tabRaw);
  const historyPage = Math.max(1, Number(query.history_page ?? "1") || 1);

  const [
    stats,
    qualityResult,
    requestsResult,
    auditResult,
    jobsResult,
    importPermissions
  ] = await Promise.all([
    getTaxonomyAdminDashboardStats(),
    getCatalogQualityForAdmin(),
    listTaxonomyRequestsForAdmin({ status: "pending", page: 1, pageSize: 25 }),
    listTaxonomyAuditLogsForAdmin({ page: 1, pageSize: 12 }),
    tab === "import_export"
      ? listTaxonomyImportExportJobs({ page: historyPage, pageSize: 20 })
      : Promise.resolve({ items: [], total: 0, error: null }),
    tab === "import_export"
      ? getTaxonomyImportExportPermissionsAction()
      : Promise.resolve({ canView: true, canImport: false, canExport: false })
  ]);

  const statsWithQuality = {
    ...stats,
    qualityAlerts: qualityResult.summary.totalIssues
  };

  return (
    <AdminTaxonomyCenter
      importExport={
        tab === "import_export"
          ? {
              initialHistoryPage: historyPage,
              initialJobs: jobsResult.items,
              initialJobsTotal: jobsResult.total,
              loadError: jobsResult.error,
              permissions: importPermissions
            }
          : null
      }
      initialAuditError={auditResult.error}
      initialAuditLogs={auditResult.items}
      initialAuditTotal={auditResult.total}
      initialGroup={group}
      initialQuality={qualityResult.summary}
      initialRequests={requestsResult.items}
      initialRequestsTotal={requestsResult.total}
      initialStats={statsWithQuality}
      initialTab={tab}
      loadError={requestsResult.error ?? stats.error ?? auditResult.error ?? qualityResult.error}
    />
  );
}
