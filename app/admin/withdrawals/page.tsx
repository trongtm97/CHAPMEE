import { AdminWithdrawalsPage } from "@/components/admin/withdrawals/AdminWithdrawalsPage";
import { ErrorState } from "@/components/ui";
import { loadAdminWithdrawalDetailAction } from "@/lib/admin/withdrawals/get-withdrawal-detail";
import { getWithdrawalKpis } from "@/lib/admin/withdrawals/get-withdrawal-kpis";
import { listAdminWithdrawals } from "@/lib/admin/withdrawals/list-admin-withdrawals";
import { parseWithdrawalFilters } from "@/lib/admin/withdrawals/parse-withdrawal-filters";
import { requirePayoutViewAccess } from "@/lib/auth/require-permission";

export const dynamic = "force-dynamic";

export default async function AdminWithdrawalsRoute({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const guard = await requirePayoutViewAccess("/admin/withdrawals");
  const params = await searchParams;
  const filters = parseWithdrawalFilters(params);

  if (!guard.ok) {
    return (
      <section className="space-y-6">
        <ErrorState message={guard.error} title="Không có quyền" variant="danger" />
      </section>
    );
  }

  const [listResult, kpiResult, detailResult] = await Promise.all([
    listAdminWithdrawals(filters),
    getWithdrawalKpis({
      startDate: filters.startDate || undefined,
      endDate: filters.endDate || undefined
    }),
    filters.selectedId
      ? loadAdminWithdrawalDetailAction(filters.selectedId)
      : Promise.resolve({ detail: null, error: null })
  ]);

  return (
    <section>
      <AdminWithdrawalsPage
        initialDetail={detailResult.detail}
        initialFilters={filters}
        initialRows={listResult.rows}
        initialTotal={listResult.total}
        loadError={listResult.error ?? detailResult.error}
        summary={kpiResult.data}
      />
    </section>
  );
}
