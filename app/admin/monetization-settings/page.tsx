import Link from "next/link";
import { MonetizationSettingsShell } from "@/components/admin/monetization/MonetizationSettingsShell";
import { getAdMonetizationOverview } from "@/lib/admin/get-ad-monetization-overview";
import { listCreatorAdPolicyAuditLogs } from "@/lib/creator-ad-revenue/audit";
import { ErrorState } from "@/components/ui";
import { getCreatorFeeOverrideStats } from "@/lib/admin/get-creator-fee-override-stats";
import { getMonetizationAuditLogs } from "@/lib/admin/get-monetization-audit-logs";
import { getCurrentAuthContext } from "@/lib/auth/permissions";
import { resolveMonetizationSettingsPermissions } from "@/lib/auth/monetization-settings-permissions";
import { requireFinanceSettingsView } from "@/lib/auth/require-permission";
import { getMonetizationConfig } from "@/lib/monetization/config";
import { getCoinPacksForAdmin } from "@/lib/data/coin-packs";
import { getPaymentProviderSettings } from "@/lib/data/payment-provider-settings";

export const dynamic = "force-dynamic";

export default async function AdminMonetizationSettingsRoute() {
  const guard = await requireFinanceSettingsView("/admin/monetization-settings");

  if (!guard.ok) {
    return (
      <section className="space-y-6">
        <ErrorState
          message={
            guard.error ??
            "Bạn không có quyền truy cập trang cấu hình kiếm tiền."
          }
          title="Không có quyền (403)"
          variant="danger"
        />
      </section>
    );
  }

  const ctx = guard.context ?? (await getCurrentAuthContext());
  const permissions = resolveMonetizationSettingsPermissions(ctx);

  let config;
  let loadError: string | null = null;

  try {
    config = await getMonetizationConfig({ includePrivate: true, useCache: false });
  } catch {
    loadError = "Không tải được cấu hình kiếm tiền.";
    config = null;
  }

  const [audit, overrideStats, topupPackages, adOverview, adAudit, paymentProviders] =
    await Promise.all([
      permissions.canViewAudit ? getMonetizationAuditLogs(10) : { logs: [], error: null },
      getCreatorFeeOverrideStats().catch(() => ({
        customRateCreators: 0,
        activeFeePolicies: 0,
        policiesNeedingReview: 0
      })),
      getCoinPacksForAdmin().catch(() => ({ data: [], error: null })),
      getAdMonetizationOverview(),
      permissions.canViewAudit
        ? listCreatorAdPolicyAuditLogs({ limit: 10 })
        : Promise.resolve({ logs: [], error: null }),
      getPaymentProviderSettings().catch(() => ({ data: [], error: null }))
    ]);
  const loadedSepaySetting =
    paymentProviders.data.find((item) => item.provider_key === "sepay") ?? null;
  const sepaySetting = loadedSepaySetting
    ? { ...loadedSepaySetting, private_config_reference: null }
    : null;

  if (loadError || !config) {
    return (
      <section className="space-y-6">
        <Link className="text-sm font-semibold text-cyan-300 hover:text-cyan-200" href="/admin">
          ← Quay lại Admin
        </Link>
        <ErrorState
          message={loadError ?? audit.error ?? "Vui lòng thử lại sau."}
          title="Lỗi tải dữ liệu"
          variant="danger"
        />
        <Link
          className="inline-flex rounded-lg bg-cyan-300 px-4 py-2 text-sm font-semibold text-zinc-950"
          href="/admin/monetization-settings"
        >
          Thử lại
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <Link className="text-sm font-semibold text-cyan-300 hover:text-cyan-200" href="/admin">
        ← Quay lại Admin
      </Link>
      <MonetizationSettingsShell
        adAuditLogs={adAudit.logs}
        adOverview={adOverview}
        auditLogs={audit.logs}
        initialSettings={config.settings}
        overrideStats={overrideStats}
        permissions={permissions}
        sepaySetting={sepaySetting}
        topupPackages={topupPackages.data}
        updatedAt={config.updatedAt}
      />
    </section>
  );
}
