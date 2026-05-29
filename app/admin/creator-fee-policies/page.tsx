import Link from "next/link";
import { AdminCreatorFeePoliciesPage } from "@/components/admin/AdminCreatorFeePoliciesPage";
import { ErrorState } from "@/components/ui";
import { requirePermission } from "@/lib/auth/require-permission";

export const dynamic = "force-dynamic";

export default async function AdminCreatorFeePoliciesRoute() {
  const guard = await requirePermission("finance.wallet.adjust", {
    returnTo: "/admin/creator-fee-policies"
  });

  if (!guard.ok) {
    return (
      <section className="space-y-6">
        <ErrorState
          message={guard.error}
          title="Không có quyền quản lý chính sách phí tác giả"
        />
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div>
        <Link className="text-sm text-cyan-300 hover:text-cyan-200" href="/admin">
          ← Admin
        </Link>
        <h1 className="mt-3 text-3xl font-bold text-white">Chính sách phí tác giả</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Override tỷ lệ doanh thu / phí nền tảng theo từng tác giả, có hiệu lực theo thời gian.
        </p>
      </div>
      <AdminCreatorFeePoliciesPage />
    </section>
  );
}
