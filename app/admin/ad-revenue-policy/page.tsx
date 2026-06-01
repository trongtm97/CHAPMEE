import Link from "next/link";
import { AdminAdRevenuePolicyHub } from "@/components/admin/ad-revenue-policy/AdminAdRevenuePolicyHub";
import { ErrorState } from "@/components/ui";
import { resolveAdRevenuePolicyPermissions } from "@/lib/auth/ad-revenue-policy-permissions";
import { getCurrentAuthContext } from "@/lib/auth/permissions";
import { requireFinanceSettingsView } from "@/lib/auth/require-permission";
import { listCreatorAdPolicyAuditLogs } from "@/lib/creator-ad-revenue/audit";
import { getAdminAdRevenuePolicyOverview } from "@/lib/creator-ad-revenue/get-admin-policy-overview";
import { listAdFraudSignalsForPolicyAdmin } from "@/lib/creator-ad-revenue/list-fraud-signals-admin";
import { listCreatorAdPolicyVersions } from "@/lib/creator-ad-revenue/policy-versions";
import { listCreatorAdMonetizationProfiles } from "@/lib/creator-ad-revenue/profiles";

export const dynamic = "force-dynamic";

export default async function AdminAdRevenuePolicyRoute() {
  const guard = await requireFinanceSettingsView("/admin/ad-revenue-policy");

  if (!guard.ok) {
    return (
      <section className="space-y-6">
        <ErrorState
          message={guard.error ?? "Bạn không có quyền xem chính sách chia doanh thu quảng cáo."}
          title="Không có quyền (403)"
          variant="danger"
        />
      </section>
    );
  }

  const ctx = guard.context ?? (await getCurrentAuthContext());
  const permissions = resolveAdRevenuePolicyPermissions(ctx);

  const [overview, profilesResult, auditResult, versionsResult, fraudResult] =
    await Promise.all([
      getAdminAdRevenuePolicyOverview(),
      listCreatorAdMonetizationProfiles({ limit: 25, offset: 0 }),
      listCreatorAdPolicyAuditLogs({ limit: 50 }),
      listCreatorAdPolicyVersions(20),
      listAdFraudSignalsForPolicyAdmin({ limit: 25 })
    ]);

  return (
    <section className="space-y-4">
      <Link className="text-sm font-semibold text-cyan-300 lg:hidden" href="/admin">
        ← Admin
      </Link>
      <AdminAdRevenuePolicyHub
        initialAuditLogs={auditResult.logs}
        initialOverview={overview}
        initialPolicy={overview.policy}
        initialFraudSignals={fraudResult.signals}
        initialProfiles={profilesResult.profiles}
        initialProfilesTotal={profilesResult.total}
        initialVersions={versionsResult.versions}
        permissions={permissions}
      />
    </section>
  );
}
