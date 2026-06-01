import Link from "next/link";
import { AdminAdRevenueReconciliationPage } from "@/components/admin/ads/AdminAdRevenueReconciliationPage";
import { ErrorState } from "@/components/ui";
import { getCurrentAuthContext } from "@/lib/auth/permissions";
import { resolveAdRevenuePolicyPermissions } from "@/lib/auth/ad-revenue-policy-permissions";
import { requireFinanceSettingsView } from "@/lib/auth/require-permission";
import {
  getAdRevenueReconciliation,
  listAdRevenueReconciliations
} from "@/lib/ads/reconciliation";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ id?: string }>;
};

export default async function AdminAdRevenueReconciliationRoute({ searchParams }: PageProps) {
  const guard = await requireFinanceSettingsView("/admin/ad-revenue-reconciliation");

  if (!guard.ok) {
    return (
      <section className="space-y-6">
        <ErrorState
          message={guard.error ?? "Bạn không có quyền xem đối soát quảng cáo."}
          title="Không có quyền (403)"
          variant="danger"
        />
      </section>
    );
  }

  const ctx = await getCurrentAuthContext();
  const permissions = resolveAdRevenuePolicyPermissions(ctx);
  const query = await searchParams;
  const selectedId = query.id ?? null;

  const listResult = await listAdRevenueReconciliations();
  const detailResult = selectedId
    ? await getAdRevenueReconciliation(selectedId)
    : { reconciliation: null, error: null };

  return (
    <section className="space-y-4">
      <Link className="text-sm font-semibold text-cyan-300" href="/admin">
        ← Admin
      </Link>
      <AdminAdRevenueReconciliationPage
        initialList={listResult.reconciliations}
        initialDetail={detailResult.reconciliation}
        selectedId={selectedId}
        canUpdate={permissions.canUpdatePolicy}
      />
    </section>
  );
}
