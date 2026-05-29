import Link from "next/link";
import { Suspense } from "react";
import { AuditLogFilters } from "@/components/admin/AuditLogFilters";
import { AuditLogTable } from "@/components/admin/AuditLogTable";
import { ErrorState } from "@/components/ui";
import { getAdminAuditLogs } from "@/lib/admin/get-audit-logs";
import { requirePermission } from "@/lib/auth/require-permission";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    page?: string;
    action?: string;
    actorId?: string;
    targetType?: string;
    from?: string;
    to?: string;
  }>;
};

export default async function AdminAuditPage({ searchParams }: PageProps) {
  const guard = await requirePermission("admin.audit.view", {
    returnTo: "/admin/audit"
  });

  if (!guard.ok) {
    return <ErrorState message={guard.error} title="Không có quyền truy cập" />;
  }

  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1) || 1);

  const { logs, error, total, pageSize } = await getAdminAuditLogs({
    page,
    pageSize: 50,
    action: params.action,
    actorId: params.actorId,
    targetType: params.targetType,
    from: params.from,
    to: params.to
  });

  return (
    <section className="space-y-6">
      <div>
        <Link className="text-sm text-cyan-300 hover:text-cyan-200" href="/admin">
          ← Admin
        </Link>
        <h1 className="mt-3 text-3xl font-bold text-white">Nhật ký audit</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Nhật ký thao tác admin: gán/gỡ role, ban/unban và các thay đổi quan trọng khác.
        </p>
      </div>

      {error ? <ErrorState message={error} title="Không tải audit log" /> : null}

      <Suspense fallback={<p className="text-sm text-zinc-500">Đang tải bộ lọc...</p>}>
        <AuditLogFilters page={page} pageSize={pageSize} total={total} />
      </Suspense>

      <AuditLogTable logs={logs} />
    </section>
  );
}
