import Link from "next/link";
import { Suspense } from "react";
import { AdminListPagination } from "@/components/admin/engagement/AdminListPagination";
import { SnippetImportExportPanel } from "@/components/admin/snippets/SnippetImportExportPanel";
import { SnippetSafeModeBanner } from "@/components/admin/snippets/SnippetSafeModeBanner";
import { SnippetsListFilters } from "@/components/admin/snippets/SnippetsListFilters";
import { SnippetsListTable } from "@/components/admin/snippets/SnippetsListTable";
import { Button, ErrorState } from "@/components/ui";
import { requireAnyPermission } from "@/lib/auth/require-permission";
import {
  getCodeSnippetGlobalSettings,
  isSnippetsDisabledByEnv
} from "@/lib/snippets/settings";
import { listCodeSnippets } from "@/lib/snippets/snippet-service";
import type { SnippetStatus, SnippetType } from "@/lib/snippets/types";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function AdminSnippetsPage({ searchParams }: PageProps) {
  const guard = await requireAnyPermission(["admin.snippets.view", "admin.dashboard.view"], {
    returnTo: "/admin/developer/snippets"
  });

  if (!guard.ok) {
    return <ErrorState message={guard.error} title="Không có quyền truy cập" variant="danger" />;
  }

  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? "1") || 1);
  const list = await listCodeSnippets({
    page,
    pageSize: 20,
    search: params.q,
    status: (params.status as SnippetStatus) || "",
    type: (params.type as SnippetType) || ""
  });

  const globalSettings = await getCodeSnippetGlobalSettings();
  const envDisabled = isSnippetsDisabledByEnv();
  const canEdit = guard.context.permissions.includes("admin.snippets.update");
  const canCreate = guard.context.permissions.includes("admin.snippets.create");
  const canActivate = guard.context.permissions.includes("admin.snippets.activate");
  const selectedIds = list.items.map((r) => r.id);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link className="text-sm font-semibold text-cyan-300 hover:text-cyan-200" href="/admin">
            ← Admin
          </Link>
          <h1 className="mt-3 text-2xl font-bold text-zinc-100">Mã tuỳ chỉnh (Snippets)</h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-400">
            Quản lý CSS, script và HTML an toàn cho frontend — không thực thi mã server.
          </p>
        </div>
        {canCreate ? (
          <Link href="/admin/developer/snippets/new">
            <Button>Tạo snippet</Button>
          </Link>
        ) : null}
      </div>

      <SnippetSafeModeBanner
        canManage={canActivate}
        envDisabled={envDisabled}
        snippetsEnabled={globalSettings.snippetsEnabled}
      />

      <Suspense fallback={<p className="text-sm text-zinc-500">Đang tải bộ lọc…</p>}>
        <SnippetsListFilters />
      </Suspense>

      <SnippetsListTable canEdit={canEdit} items={list.items} />

      <AdminListPagination
        basePath="/admin/developer/snippets"
        page={list.page}
        pageSize={list.pageSize}
        total={list.total}
        totalPages={list.totalPages}
      />

      {guard.context.permissions.includes("admin.snippets.import_export") ? (
        <SnippetImportExportPanel selectedIds={selectedIds} />
      ) : null}
    </div>
  );
}
