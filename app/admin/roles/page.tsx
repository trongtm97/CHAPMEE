import Link from "next/link";
import { AdminRolesPage } from "@/components/admin/AdminRolesPage";
import { ErrorState } from "@/components/ui";
import { getRoleCenterData } from "@/lib/admin/get-role-center-data";
import { requireAnyPermission } from "@/lib/auth/require-permission";

export const dynamic = "force-dynamic";

export default async function RolesPage() {
  const guard = await requireAnyPermission(
    [
      "admin.role.view",
      "admin.user.role.view",
      "admin.settings.view",
      "admin.user.role.assign"
    ],
    { returnTo: "/admin/roles" }
  );

  if (!guard.ok) {
    return <ErrorState message={guard.error} title="Không có quyền truy cập" />;
  }

  const data = await getRoleCenterData();

  return (
    <section className="space-y-6">
      <div>
        <Link className="text-sm text-cyan-300 hover:text-cyan-200" href="/admin">
          ← Admin
        </Link>
        <h1 className="mt-3 text-3xl font-bold text-white">Vai trò & quyền</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Quản lý vai trò, quyền truy cập, người dùng được cấp quyền và lịch sử thay đổi phân
          quyền trên ChapMee.
        </p>
      </div>

      <AdminRolesPage
        auditLogs={data.auditLogs}
        capabilities={data.capabilities}
        error={data.error}
        roles={data.roles}
        summary={data.summary}
      />
    </section>
  );
}
