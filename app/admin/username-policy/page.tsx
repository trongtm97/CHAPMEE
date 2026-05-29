import Link from "next/link";
import { AdminUsernamePolicyPage } from "@/components/admin/AdminUsernamePolicyPage";
import { ErrorState } from "@/components/ui";
import { getUsernamePolicyAdminData } from "@/lib/admin/get-username-policy-admin-data";
import { requirePermission } from "@/lib/auth/require-permission";

export const dynamic = "force-dynamic";

export default async function AdminUsernamePolicyPageRoute() {
  const guard = await requirePermission("admin.user.update", {
    returnTo: "/admin/username-policy"
  });

  if (!guard.ok) {
    return (
      <section className="space-y-6">
        <ErrorState message={guard.error} title="Không có quyền truy cập" />
      </section>
    );
  }

  const data = await getUsernamePolicyAdminData();

  return (
    <section className="space-y-6">
      <div>
        <Link className="text-sm text-cyan-300 hover:text-cyan-200" href="/admin">
          ← Admin
        </Link>
        <h1 className="mt-3 text-3xl font-bold text-white">Chính sách username & tên</h1>
        <p className="mt-2 max-w-3xl text-sm text-zinc-400">
          Quản lý username bị cấm, giữ chỗ, từ bảo vệ, ngoại lệ, tranh chấp và lịch sử đổi
          username.
        </p>
      </div>
      <AdminUsernamePolicyPage
        auditLogs={data.auditLogs}
        capabilities={data.capabilities}
        conflicts={data.conflicts}
        exceptions={data.exceptions}
        history={data.history}
        rules={data.rules}
        rulesError={data.rulesError}
        summary={
          data.summary ?? {
            banned: 0,
            reserved: 0,
            protected: 0,
            exceptions: 0,
            conflicts: 0,
            changes7d: 0,
            inactive: 0
          }
        }
      />
    </section>
  );
}
