import { AdminRefundsPage } from "@/components/admin/refunds/AdminRefundsPage";
import { ErrorState } from "@/components/ui";
import { buildRefundAdminCapabilities } from "@/lib/admin/refunds/refund-capabilities";
import { loadRefundDetailByRowId } from "@/lib/admin/refunds/get-refund-detail";
import { getRefundKpis } from "@/lib/admin/refunds/get-refund-kpis";
import { listAdminRefunds } from "@/lib/admin/refunds/list-admin-refunds";
import { parseRefundFilters } from "@/lib/admin/refunds/refund-labels";
import { requireRefundAdminAccess } from "@/lib/auth/require-permission";

export const dynamic = "force-dynamic";

export default async function AdminRefundsRoute({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const guard = await requireRefundAdminAccess("/admin/refunds");
  const params = await searchParams;
  const filters = parseRefundFilters(params);

  if (!guard.ok) {
    return (
      <section className="space-y-6">
        <ErrorState message={guard.error} title="Không có quyền truy cập" variant="danger" />
      </section>
    );
  }

  const capabilities = buildRefundAdminCapabilities(guard.context.permissions);

  const [listResult, kpiResult] = await Promise.all([
    listAdminRefunds(filters),
    getRefundKpis({
      startDate: filters.startDate || undefined,
      endDate: filters.endDate || undefined
    })
  ]);

  let initialDetail = null;
  let detailError: string | null = null;
  if (filters.selectedId) {
    const row = listResult.rows.find((r) => r.id === filters.selectedId);
    if (row) {
      const detailResult = await loadRefundDetailByRowId(row.refundId, row.kind);
      initialDetail = detailResult.detail;
      detailError = detailResult.error;
    }
  }

  return (
    <section>
      <AdminRefundsPage
        capabilities={capabilities}
        initialDetail={initialDetail}
        initialFilters={filters}
        initialRows={listResult.rows}
        initialTotal={listResult.total}
        loadError={listResult.error ?? detailError}
        summary={kpiResult.data}
      />
    </section>
  );
}
