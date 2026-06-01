import Link from "next/link";
import { AdminAdsHub } from "@/components/admin/ads/AdminAdsHub";
import { ErrorState } from "@/components/ui";
import {
  getAdPlacementRevenuePrepAdmin,
  getAdPlacementStatsAdmin,
  listAdPlacementsAdmin
} from "@/lib/ads/admin/placements";
import { parseAdPlacementListFilters } from "@/lib/ads/parse-admin-filters";
import { getCurrentAuthContext } from "@/lib/auth/permissions";
import { requireFinanceSettingsView } from "@/lib/auth/require-permission";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function canEditAds(ctx: Awaited<ReturnType<typeof getCurrentAuthContext>>) {
  if (!ctx) return false;
  return (
    ctx.permissions.includes("finance.settings.update") ||
    ctx.permissions.includes("admin.settings.update") ||
    ctx.roles.includes("owner") ||
    ctx.roles.includes("super_admin")
  );
}

export default async function AdminAdsRoute({ searchParams }: PageProps) {
  const guard = await requireFinanceSettingsView("/admin/ads");

  if (!guard.ok) {
    return (
      <section className="space-y-6">
        <ErrorState
          message={guard.error ?? "Bạn không có quyền quản lý quảng cáo."}
          title="Không có quyền (403)"
          variant="danger"
        />
      </section>
    );
  }

  const query = await searchParams;
  const filters = parseAdPlacementListFilters(query);
  const ctx = guard.context ?? (await getCurrentAuthContext());

  const [listResult, statsResult, revenuePrep] = await Promise.all([
    listAdPlacementsAdmin(filters),
    getAdPlacementStatsAdmin(),
    getAdPlacementRevenuePrepAdmin()
  ]);

  const emptyStats = {
    totalPlacements: 0,
    enabledCount: 0,
    testModeCount: 0,
    renderedToday: 0,
    impressionsToday: 0,
    clicksToday: 0,
    estimatedRevenueToday: 0,
    warningPlacementCount: 0,
    statsAvailable: false
  };

  return (
    <section className="space-y-4">
      <Link className="text-sm font-semibold text-cyan-300 lg:hidden" href="/admin">
        ← Admin
      </Link>
      <AdminAdsHub
        canEdit={canEditAds(ctx)}
        initialFilters={filters}
        initialItems={listResult.items}
        initialRevenuePrep={revenuePrep.prep}
        initialStats={statsResult.stats ?? emptyStats}
        initialTotal={listResult.total}
        loadError={listResult.error ?? statsResult.error ?? revenuePrep.error}
      />
    </section>
  );
}
