import { AdminCreatorFeePoliciesPage } from "@/components/admin/AdminCreatorFeePoliciesPage";
import { ErrorState } from "@/components/ui";
import { buildCreatorFeePolicyCapabilities } from "@/lib/admin/creator-fee-policies/capabilities";
import { parseCreatorFeePolicyFilters } from "@/lib/admin/creator-fee-policies/filters";
import { listCreatorFeePoliciesAction } from "@/lib/admin/creator-fee-policies/list-policies";
import { getCreatorFeePolicyStatsAction } from "@/lib/admin/creator-fee-policies/preview-policy";
import { requireCreatorFeeAdminAccess } from "@/lib/auth/require-permission";
import { buildDefaultSourceRates } from "@/lib/finance/resolve-creator-fee-policy";

export const dynamic = "force-dynamic";

export default async function AdminCreatorFeePoliciesRoute({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const guard = await requireCreatorFeeAdminAccess("/admin/creator-fee-policies");
  const params = await searchParams;
  const filters = parseCreatorFeePolicyFilters(params);

  if (!guard.ok) {
    return (
      <section className="space-y-6">
        <ErrorState
          message={guard.error}
          title="Không có quyền quản lý chính sách phí tác giả"
          variant="danger"
        />
      </section>
    );
  }

  const capabilities = buildCreatorFeePolicyCapabilities(guard.context.permissions);

  const [listResult, statsResult, defaultRates] = await Promise.all([
    listCreatorFeePoliciesAction(filters),
    getCreatorFeePolicyStatsAction(),
    buildDefaultSourceRates()
  ]);

  return (
    <section>
      <AdminCreatorFeePoliciesPage
        capabilities={capabilities}
        defaultRates={defaultRates}
        initialFilters={filters}
        initialRows={listResult.rows}
        initialTotal={listResult.total}
        loadError={listResult.error}
        summary={statsResult.data}
      />
    </section>
  );
}
