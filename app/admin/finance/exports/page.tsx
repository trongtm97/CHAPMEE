import Link from "next/link";
import { FinanceExportPanel } from "@/components/admin/finance/FinanceExportPanel";
import { ErrorState } from "@/components/ui";
import { requireFinanceAccess } from "@/lib/auth/require-permission";

export const dynamic = "force-dynamic";

export default async function AdminFinanceExportsPage() {
  const guard = await requireFinanceAccess("/admin/finance/exports");
  if (!guard.ok) {
    return (
      <section className="space-y-6">
        <h1 className="text-3xl font-bold">Không có quyền truy cập</h1>
        <ErrorState message={guard.error} title="Không có quyền truy cập admin" variant="danger" />
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div>
        <Link className="text-sm font-semibold text-cyan-300 hover:text-cyan-200" href="/admin/finance">
          ← Bảng điều khiển tài chính
        </Link>
        <h1 className="mt-3 text-3xl font-bold tracking-normal">Xuất báo cáo tài chính</h1>
      </div>
      <FinanceExportPanel />
    </section>
  );
}
