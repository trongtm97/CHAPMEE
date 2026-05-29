import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { ErrorState } from "@/components/ui";
import { getAdminDashboardSummary } from "@/lib/admin/get-admin-dashboard-summary";
import { getCurrentAuthContext } from "@/lib/auth/permissions";
import { requireAdminOrModerator } from "@/lib/auth/requireAdminOrModerator";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const guard = await requireAdminOrModerator("/admin");

  if (!guard.ok) {
    return (
      <section className="space-y-6">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-cyan-300">
            Quản trị
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-normal">
            Không có quyền truy cập
          </h1>
        </div>
        <ErrorState
          message={guard.error}
          title="Không có quyền truy cập admin"
          variant="danger"
        />
      </section>
    );
  }

  const authContext = await getCurrentAuthContext();
  const summary = await getAdminDashboardSummary(authContext?.flags);

  const staffRoles = (authContext?.roles ?? []).filter((code) =>
    [
      "moderator",
      "content_admin",
      "finance_admin",
      "support_admin",
      "admin",
      "super_admin",
      "owner"
    ].includes(code)
  );

  const roleLabels =
    staffRoles.length > 0
      ? staffRoles
      : authContext?.permissions.includes("admin.dashboard.view")
        ? ["admin"]
        : authContext?.permissions.includes("report.review")
          ? ["moderator"]
          : authContext?.permissions.includes("finance.dashboard.view")
            ? ["finance_admin"]
            : [];

  return (
    <section className="space-y-6">
      {summary.error ? (
        <ErrorState message={summary.error} title="Không tải được một phần dữ liệu" />
      ) : null}
      <AdminDashboard roleLabels={roleLabels} summary={summary} />
    </section>
  );
}
