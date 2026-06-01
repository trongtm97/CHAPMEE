import { FairnessExposureDashboard } from "@/components/admin/algorithm/FairnessExposureDashboard";
import { AdminFairnessSettingsSection } from "@/components/admin/algorithm/AdminFairnessSettingsSection";
import { ErrorState } from "@/components/ui";
import { loadAlgorithmSettingsPageData } from "@/lib/admin/algorithm-settings-data";
import { loadFairnessDashboardData } from "@/lib/admin/fairness-dashboard-data";
import { requireFinanceSettingsView } from "@/lib/auth/require-permission";

export const dynamic = "force-dynamic";

export default async function AdminAlgorithmFairnessPage() {
  const guard = await requireFinanceSettingsView("/admin/algorithm/fairness");

  if (!guard.ok) {
    return <ErrorState message={guard.error} title="Không có quyền truy cập" variant="danger" />;
  }

  const [dashboard, settings] = await Promise.all([
    loadFairnessDashboardData(),
    loadAlgorithmSettingsPageData()
  ]);

  return (
    <div className="space-y-8">
      <header>
        <p className="page-kicker">Hệ thống · Thuật toán</p>
        <h1 className="page-title">Công bằng hiển thị & Exposure Cap</h1>
        <p className="page-copy">
          Giám sát tập trung impression, cảnh báo concentration và chỉnh ngưỡng cap/boost.
        </p>
      </header>

      <FairnessExposureDashboard data={dashboard} />

      <section className="space-y-4" id="fairness-settings">
        <h2 className="text-lg font-black text-white">Rule settings</h2>
        {settings.error ? (
          <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-100">
            {settings.error}
          </div>
        ) : null}
        <AdminFairnessSettingsSection initialData={settings} />
        {!settings.canUpdate ? (
          <p className="text-center text-xs text-zinc-500">
            Bạn chỉ có quyền xem. Cần quyền cập nhật settings để chỉnh ngưỡng.
          </p>
        ) : null}
      </section>
    </div>
  );
}
