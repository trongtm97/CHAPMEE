import { ColdStartAdminDashboard } from "@/components/admin/algorithm/ColdStartAdminDashboard";
import { ErrorState } from "@/components/ui";
import { loadColdStartDashboardData } from "@/lib/admin/cold-start-dashboard-data";
import { requireFinanceSettingsView } from "@/lib/auth/require-permission";

export const dynamic = "force-dynamic";

export default async function AdminAlgorithmColdStartPage() {
  const guard = await requireFinanceSettingsView("/admin/algorithm/cold-start");

  if (!guard.ok) {
    return <ErrorState message={guard.error} title="Không có quyền truy cập" variant="danger" />;
  }

  const data = await loadColdStartDashboardData();

  return (
    <div className="space-y-8">
      <header>
        <p className="page-kicker">Hệ thống · Thuật toán</p>
        <h1 className="page-title">Cold Start</h1>
        <p className="page-copy">
          Theo dõi quota thử nghiệm cho nội dung mới — qualify vào growth pool hoặc giảm phân phối khi tín hiệu xấu.
        </p>
      </header>

      <ColdStartAdminDashboard data={data} />
    </div>
  );
}
