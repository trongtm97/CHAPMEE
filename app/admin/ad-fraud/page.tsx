import Link from "next/link";
import { AdminAdFraudPage } from "@/components/admin/ads/AdminAdFraudPage";
import { ErrorState } from "@/components/ui";
import { getAdFraudDashboard } from "@/lib/ads/get-fraud-dashboard";
import { listAdFraudRules } from "@/lib/ads/fraud-rules";
import { listAdFraudSignals } from "@/lib/ads/fraud-signals";
import { resolveAdRevenuePolicyPermissions } from "@/lib/auth/ad-revenue-policy-permissions";
import { getCurrentAuthContext } from "@/lib/auth/permissions";
import { requireFinanceSettingsView } from "@/lib/auth/require-permission";

export const dynamic = "force-dynamic";

export default async function AdminAdFraudRoute() {
  const guard = await requireFinanceSettingsView("/admin/ad-fraud");

  if (!guard.ok) {
    return (
      <section className="space-y-6">
        <ErrorState
          message={guard.error ?? "Bạn không có quyền xem cảnh báo quảng cáo."}
          title="Không có quyền (403)"
          variant="danger"
        />
      </section>
    );
  }

  const ctx = await getCurrentAuthContext();
  const permissions = resolveAdRevenuePolicyPermissions(ctx);

  const [dashboardRes, signalsRes, rulesRes] = await Promise.all([
    getAdFraudDashboard(),
    listAdFraudSignals({ status: "open", limit: 100 }),
    listAdFraudRules()
  ]);

  return (
    <section className="space-y-4">
      <Link className="text-sm font-semibold text-cyan-300" href="/admin">
        ← Admin
      </Link>
      <AdminAdFraudPage
        initialDashboard={dashboardRes.dashboard}
        initialSignals={signalsRes.signals}
        initialRules={rulesRes.rules}
        canUpdate={permissions.canUpdatePolicy}
      />
    </section>
  );
}
