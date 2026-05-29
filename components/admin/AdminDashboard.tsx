import { AdminActionQueue } from "@/components/admin/AdminActionQueue";
import { AdminMetricCard } from "@/components/admin/AdminMetricCard";
import { AdminRiskAlerts } from "@/components/admin/AdminRiskAlerts";
import { AdminShortcutGroups } from "@/components/admin/AdminShortcutGroups";
import { formatAdminRoleLabel } from "@/lib/admin/role-labels";
import type { AdminDashboardSummary } from "@/types/admin-dashboard";
import type { RoleCode } from "@/types/permissions";

type AdminDashboardProps = {
  summary: AdminDashboardSummary;
  roleLabels: string[];
};

export function AdminDashboard({ summary, roleLabels }: AdminDashboardProps) {
  const roleLine =
    roleLabels.length > 0
      ? roleLabels.map((code) => formatAdminRoleLabel(code as RoleCode)).join(", ")
      : "Đang kiểm tra quyền";

  return (
    <div className="mx-auto w-full max-w-[1320px] space-y-8">
      <header className="space-y-2 border-b border-white/10 pb-6">
        <p className="text-sm font-medium uppercase tracking-wide text-cyan-300">
          ChapMee
        </p>
        <h1 className="text-3xl font-bold tracking-normal text-white">
          Trung tâm quản trị
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-zinc-400">
          Quản lý vận hành, nội dung, người dùng, tài chính và cấu hình hệ thống
          ChapMee.
        </p>
        <p className="text-sm text-zinc-500">
          Vai trò hiện tại:{" "}
          <span className="font-medium text-zinc-300">{roleLine}</span>
        </p>
      </header>

      <AdminActionQueue items={summary.actionQueue} />
      <AdminRiskAlerts alerts={summary.riskAlerts} />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">Chỉ số nhanh</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {summary.quickMetrics.map((metric) => (
            <AdminMetricCard
              href={metric.href}
              key={metric.id}
              label={metric.label}
              sublabel={metric.sublabel}
              unavailable={metric.unavailable}
              value={metric.value}
            />
          ))}
        </div>
      </section>

      <AdminShortcutGroups groups={summary.shortcutGroups} />
    </div>
  );
}
