import { Suspense } from "react";
import { EcosystemFairnessDashboard } from "@/components/admin/algorithm/EcosystemFairnessDashboard";
import { ErrorState } from "@/components/ui";
import { loadEcosystemDashboardData } from "@/lib/admin/ecosystem-dashboard-data";
import { requireFinanceSettingsView } from "@/lib/auth/require-permission";
import {
  parseEcosystemSurface,
  parseEcosystemTimeWindow
} from "@/types/ecosystem-dashboard";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ surface?: string; window?: string }>;
};

function DashboardFallback() {
  return <div className="h-40 animate-pulse rounded-xl bg-white/5" />;
}

export default async function AdminEcosystemFairnessPage({ searchParams }: PageProps) {
  const guard = await requireFinanceSettingsView("/admin/algorithm/ecosystem");

  if (!guard.ok) {
    return <ErrorState message={guard.error} title="Không có quyền truy cập" variant="danger" />;
  }

  const params = await searchParams;
  const surface = parseEcosystemSurface(params.surface);
  const timeWindow = parseEcosystemTimeWindow(params.window);
  const data = await loadEcosystemDashboardData({ surface, timeWindow });

  return (
    <div className="space-y-8">
      <header>
        <p className="page-kicker">Hệ thống · Thuật toán</p>
        <h1 className="page-title">Ecosystem Fairness</h1>
        <p className="page-copy">
          Giám sát lệch phân phối impression — concentration, new author, long-tail và thể loại.
        </p>
      </header>

      <Suspense fallback={<DashboardFallback />}>
        <EcosystemFairnessDashboard data={data} />
      </Suspense>
    </div>
  );
}
