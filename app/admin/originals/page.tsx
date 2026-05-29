import Link from "next/link";
import { OriginalsDashboard } from "@/components/admin/originals/OriginalsDashboard";
import { ErrorState, SectionHeader } from "@/components/ui";
import { requireAdminSettingsAccess } from "@/lib/auth/require-permission";
import { getMonetizationConfig } from "@/lib/monetization/config";
import { getAdminOriginalsDashboardData } from "@/lib/monetization/originals";

export const dynamic = "force-dynamic";

export default async function AdminOriginalsPage() {
  const guard = await requireAdminSettingsAccess("/admin/originals");
  if (!guard.ok) {
    return (
      <section className="space-y-6">
        <SectionHeader title="Không có quyền truy cập" subtitle="Chỉ dành cho quản trị viên hoặc founder." />
        <ErrorState message={guard.error} title="Không có quyền truy cập admin" variant="danger" />
      </section>
    );
  }

  const { settings } = await getMonetizationConfig({ includePrivate: true });
  const enabled =
    Boolean(settings["monetization.enabled"]) && Boolean(settings["originals_enabled"]);
  if (!enabled) {
    return (
      <section className="space-y-6">
        <Link className="text-sm font-semibold text-cyan-300 hover:text-cyan-200" href="/admin">
          ← Admin
        </Link>
        <ErrorState title="Originals đang tắt" message="Originals đang tắt bởi admin config." />
      </section>
    );
  }

  const dashboard = await getAdminOriginalsDashboardData();

  return (
    <section className="space-y-6">
      <div>
        <Link className="text-sm font-semibold text-cyan-300 hover:text-cyan-200" href="/admin">
          ← Admin
        </Link>
        <h1 className="mt-3 text-3xl font-bold tracking-normal">Originals / IP Deals</h1>
      </div>
      <OriginalsDashboard
        candidateRecommendations={dashboard.candidateRecommendations}
        dealFinancialsByDeal={dashboard.dealFinancialsByDeal}
        deals={dashboard.deals}
        storyStatuses={dashboard.storyStatuses}
      />
    </section>
  );
}
