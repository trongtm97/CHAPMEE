import { AdminTransactionsPage } from "@/components/admin/transactions/AdminTransactionsPage";
import { ErrorState } from "@/components/ui";
import { buildRefundAdminCapabilities } from "@/lib/admin/refunds/refund-capabilities";
import { listAdminTransactions } from "@/lib/admin/transactions/get-admin-transactions";
import { getTransactionKpis } from "@/lib/admin/transactions/get-transaction-kpis";
import { parseTransactionFilters } from "@/lib/admin/transactions/parse-transaction-filters";
import { requireFinanceAccess } from "@/lib/auth/require-permission";

export const dynamic = "force-dynamic";

type AdminTransactionsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminTransactionsRoute({
  searchParams
}: AdminTransactionsPageProps) {
  const guard = await requireFinanceAccess("/admin/transactions");

  if (!guard.ok) {
    return (
      <section className="space-y-6">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-cyan-300">Admin</p>
          <h1 className="mt-3 text-3xl font-bold tracking-normal">Không có quyền truy cập</h1>
        </div>
        <ErrorState
          message={guard.error}
          title="Không có quyền truy cập admin"
          variant="danger"
        />
      </section>
    );
  }

  const params = await searchParams;
  const filters = parseTransactionFilters(params);

  const refundCaps = buildRefundAdminCapabilities(guard.context.permissions);

  const [listResult, kpiResult] = await Promise.all([
    listAdminTransactions(filters),
    getTransactionKpis({
      startDate: filters.startDate || undefined,
      endDate: filters.endDate || undefined
    })
  ]);

  return (
    <AdminTransactionsPage
      canCreateRefund={refundCaps.canCreate}
      initialFilters={filters}
      initialRows={listResult.rows}
      initialTotal={listResult.total}
      loadError={listResult.error}
      summary={kpiResult.data}
    />
  );
}
