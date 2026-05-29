import Link from "next/link";
import { MonetizationSettingsDashboard } from "@/components/admin/MonetizationSettingsDashboard";
import { ErrorState } from "@/components/ui";
import { getCreatorFeeOverrideStats } from "@/lib/admin/get-creator-fee-override-stats";
import { getMonetizationAuditLogs } from "@/lib/admin/get-monetization-audit-logs";
import { getCurrentAuthContext } from "@/lib/auth/permissions";
import { resolveMonetizationSettingsPermissions } from "@/lib/auth/monetization-settings-permissions";
import { requireFinanceSettingsView } from "@/lib/auth/require-permission";
import { getMonetizationConfig } from "@/lib/monetization/config";

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

  const [audit, overrideStats] = await Promise.all([
    permissions.canViewAudit ? getMonetizationAuditLogs(10) : { logs: [], error: null },
    getCreatorFeeOverrideStats().catch(() => ({
      customRateCreators: 0,
      activeFeePolicies: 0,
      policiesNeedingReview: 0
    }))
  ]);

  if (loadError || !config) {
    return (
      <section className="space-y-6">
        <Link className="text-sm font-semibold text-cyan-300" href="/admin">
          ← Admin
        </Link>
        <ErrorState
          message={loadError ?? audit.error ?? "Vui lòng thử lại sau."}
          title="Lỗi tải dữ liệu"
          variant="danger"
        />
        <form action="/admin/monetization-settings">
          <button
            className="rounded-lg bg-cyan-300 px-4 py-2 text-sm font-semibold text-zinc-950"
            type="submit"
          >
            Thử lại
          </button>
        </form>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <Link className="text-sm font-semibold text-cyan-300" href="/admin">
        ← Admin
      </Link>
      <MonetizationSettingsDashboard
        auditLogs={audit.logs}
        initialSettings={config.settings}
        overrideStats={overrideStats}
        permissions={permissions}
        updatedAt={config.updatedAt}
      />
    </section>
  );
}
