import Link from "next/link";
import { AdminAdRevenuePage } from "@/components/admin/ads/AdminAdRevenuePage";
import { ErrorState } from "@/components/ui";
import { getAdRevenueAdminDashboard } from "@/lib/ads/get-ad-revenue-admin-dashboard";
import { getAdRevenueEstimateSettings } from "@/lib/ads/ad-revenue-settings";
import { requireFinanceSettingsView } from "@/lib/auth/require-permission";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function pickParam(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

export default async function AdminAdRevenueRoute({ searchParams }: PageProps) {
  const guard = await requireFinanceSettingsView("/admin/ad-revenue");

  if (!guard.ok) {
    return (
      <section className="space-y-6">
        <ErrorState
          message={guard.error ?? "Bạn không có quyền xem báo cáo quảng cáo."}
          title="Không có quyền (403)"
          variant="danger"
        />
      </section>
    );
  }

  const query = await searchParams;
  const now = new Date();
  const defaultTo = now.toISOString().slice(0, 10);
  const defaultFromDate = new Date(now);
  defaultFromDate.setDate(defaultFromDate.getDate() - 29);

  const filters = {
    from: pickParam(query.from) || defaultFromDate.toISOString().slice(0, 10),
    to: pickParam(query.to) || defaultTo,
    month: pickParam(query.month)
  };

  const [settings, dashboardResult] = await Promise.all([
    getAdRevenueEstimateSettings({ useAdmin: true }),
    getAdRevenueAdminDashboard({
      from: filters.month ? undefined : filters.from,
      to: filters.month ? undefined : filters.to,
      month: filters.month || undefined
    })
  ]);

  return (
    <section className="space-y-4">
      <Link className="text-sm font-semibold text-cyan-300" href="/admin">
        ← Admin
      </Link>
      <AdminAdRevenuePage
        initialDashboard={dashboardResult.dashboard}
        initialFilters={filters}
        initialSettings={settings}
        loadError={dashboardResult.error}
      />
    </section>
  );
}
