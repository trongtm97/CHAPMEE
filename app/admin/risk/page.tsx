import Link from "next/link";
import { ErrorState, SectionHeader } from "@/components/ui";
import { requireFinanceAccess } from "@/lib/auth/require-permission";
import { listRiskEventsForAdmin } from "@/lib/supabase/risk";
import { RiskDashboard } from "@/components/admin/risk/RiskDashboard";
import { RiskEventTable } from "@/components/admin/risk/RiskEventTable";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminRiskPage() {
  const guard = await requireFinanceAccess("/admin/risk");
  if (!guard.ok) {
    return (
      <section className="space-y-6">
        <SectionHeader title="Không có quyền truy cập" subtitle="Chỉ dành cho quản trị viên hoặc founder." />
        <ErrorState message={guard.error} title="Không có quyền truy cập admin" variant="danger" />
      </section>
    );
  }

  const events = await listRiskEventsForAdmin(300);
  if (events.error) {
    return (
      <section className="space-y-6">
        <ErrorState message={events.error} title="Không tải được sự kiện rủi ro" />
      </section>
    );
  }

  const openCount = events.data.filter((event) => event.status === "open").length;
  const highCriticalCount = events.data.filter((event) =>
    ["high", "critical"].includes(event.severity)
  ).length;
  const suspiciousTransactions = events.data.filter((event) => event.transaction_id).length;

  const supabase = await createClient();
  const blockedProfiles = await supabase
    .from("user_risk_profiles")
    .select("id", { count: "exact", head: true })
    .eq("payout_blocked", true);
  const payoutBlockedCount = blockedProfiles.count ?? 0;

  return (
    <section className="space-y-6">
      <div>
        <Link className="text-sm font-semibold text-cyan-300 hover:text-cyan-200" href="/admin">
          ← Admin
        </Link>
        <h1 className="mt-3 text-3xl font-bold tracking-normal">Risk Dashboard</h1>
      </div>
      <RiskDashboard
        highCriticalCount={highCriticalCount}
        openCount={openCount}
        payoutBlockedCount={payoutBlockedCount}
        suspiciousTransactions={suspiciousTransactions}
      />
      <RiskEventTable events={events.data} />
    </section>
  );
}
