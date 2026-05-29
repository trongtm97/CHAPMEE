import { AdminCreatorsPage } from "@/components/admin/creators/AdminCreatorsPage";
import { ErrorState } from "@/components/ui";
import { buildCreatorAdminCapabilities } from "@/lib/admin/creator-admin-capabilities";
import { getCreatorOperationsSummary } from "@/lib/admin/get-creator-operations-summary";
import { listAdminCreators } from "@/lib/admin/get-creators";
import { loadAdminCreatorDetailAction } from "@/lib/admin/load-creator-detail";
import { parseCreatorDashboardFilters } from "@/lib/admin/parse-creator-dashboard-filters";
import { requireAdminSettingsAccess } from "@/lib/auth/require-permission";
import type { RoleCode } from "@/types/permissions";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminCreatorsRoute({ searchParams }: PageProps) {
  const guard = await requireAdminSettingsAccess("/admin/creators");

  if (!guard.ok) {
    return <ErrorState message={guard.error} title="Không có quyền truy cập" />;
  }

  const query = await searchParams;
  const filters = parseCreatorDashboardFilters(query);
  const capabilities = buildCreatorAdminCapabilities({
    permissions: guard.context.permissions,
    roles: guard.context.roles as RoleCode[]
  });

  let loadError = false;
  let creators: Awaited<ReturnType<typeof listAdminCreators>>["creators"] = [];
  let total = 0;
  let summary = await getCreatorOperationsSummary();

  try {
    const [listResult, summaryResult] = await Promise.all([
      listAdminCreators(filters),
      getCreatorOperationsSummary()
    ]);
    if (listResult.error) {
      loadError = true;
    } else {
      creators = listResult.creators;
      total = listResult.total;
    }
    summary = summaryResult;
  } catch {
    loadError = true;
  }

  if (filters.selectedUserId && !loadError) {
    const detailResult = await loadAdminCreatorDetailAction(filters.selectedUserId);
    if (!detailResult.detail) {
      filters.selectedUserId = undefined;
    }
  }

  return (
    <AdminCreatorsPage
      capabilities={capabilities}
      initialCreators={creators}
      initialFilters={filters}
      initialTotal={total}
      loadError={loadError}
      moderatorId={guard.context.userId}
      summary={summary}
    />
  );
}
