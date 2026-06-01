import { RankingAdminDashboard } from "@/components/admin/algorithm/RankingAdminDashboard";
import { ErrorState } from "@/components/ui";
import { loadRankingAdminDashboardData } from "@/lib/admin/ranking-dashboard-data";
import { requireFinanceSettingsView } from "@/lib/auth/require-permission";

export const dynamic = "force-dynamic";

export default async function AdminAlgorithmRankingsPage() {
  const guard = await requireFinanceSettingsView("/admin/algorithm/rankings");

  if (!guard.ok) {
    return <ErrorState message={guard.error} title="Không có quyền truy cập" variant="danger" />;
  }

  const data = await loadRankingAdminDashboardData();

  return (
    <div className="space-y-8">
      <header>
        <p className="page-kicker">Hệ thống · Thuật toán</p>
        <h1 className="page-title">Bảng xếp hạng</h1>
        <p className="page-copy">
          Giám sát snapshot, concentration và tái tạo bảng xếp hạng đa loại.
        </p>
      </header>

      <RankingAdminDashboard data={data} />
    </div>
  );
}
