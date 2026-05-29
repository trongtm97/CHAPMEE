import { AdminCoinsPage } from "@/components/admin/AdminCoinsPage";
import { ErrorState } from "@/components/ui";
import { buildCoinAdminCapabilities } from "@/lib/admin/coin-capabilities";
import { getAdminCoinLimits } from "@/lib/admin/coin-limits";
import { getAdminCoinDashboardMetrics } from "@/lib/admin/coins";
import { getCurrentAuthContext } from "@/lib/auth/permissions";
import { requireAnyPermission } from "@/lib/auth/require-permission";

export const dynamic = "force-dynamic";

const COIN_PAGE_PERMISSIONS = [
  "finance.wallet.view",
  "finance.wallet.adjust",
  "wallet.transaction.view.all"
] as const;

export default async function AdminCoinsPageRoute() {
  const guard = await requireAnyPermission([...COIN_PAGE_PERMISSIONS], {
    returnTo: "/admin/coins"
  });

  if (!guard.ok) {
    return (
      <section className="space-y-6">
        <ErrorState message={guard.error} title="Không có quyền quản lý coin" />
      </section>
    );
  }

  const ctx = await getCurrentAuthContext();
  const capabilities = buildCoinAdminCapabilities(ctx?.permissions ?? []);

  const [metricsResult, limits] = await Promise.all([
    getAdminCoinDashboardMetrics(),
    capabilities.canAdjust ? getAdminCoinLimits() : Promise.resolve(null)
  ]);

  const metrics = metricsResult.data ?? {
    totalPaidCoinInCirculation: 0,
    totalBonusCoinInCirculation: 0,
    coinSoldToday: 0,
    coinSpentToday: 0,
    bonusGrantedToday: 0,
    coinTransactionsToday: 0,
    adminAdjustmentsToday: 0,
    coinRiskAlerts: 0
  };

  const resolvedLimits = limits ?? {
    maxPerUserPerAction: 10_000,
    maxBatchUsers: 100,
    maxBatchTotalCoins: 100_000,
    highAmountWarning: 5_000
  };

  return (
    <section>
      <AdminCoinsPage
        capabilities={capabilities}
        initialMetrics={metrics}
        limits={resolvedLimits}
      />
    </section>
  );
}
