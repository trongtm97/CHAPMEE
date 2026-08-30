import { Suspense } from "react";
import { AdminListPagination } from "@/components/admin/engagement/AdminListPagination";
import { Seo404MonitorList } from "@/components/admin/seo/Seo404MonitorList";
import { ErrorState } from "@/components/ui";
import { requireAnyPermission } from "@/lib/auth/require-permission";
import { listSeo404Logs } from "@/lib/seo/404-log-service";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

function MonitorFilters({
  searchParams
}: {
  searchParams: Record<string, string | undefined>;
}) {
  const q = searchParams.q ?? "";
  return (
    <form
      action="/admin/seo/404-monitor"
      className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4"
      method="get"
    >
      <label className="block space-y-1 text-sm">
        <span className="font-medium text-zinc-400">Tìm path</span>
        <input
          className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
          defaultValue={q}
          name="q"
          placeholder="/missing-page"
        />
      </label>
    </form>
  );
}

export default async function AdminSeo404MonitorPage({ searchParams }: PageProps) {
  const guard = await requireAnyPermission(
    ["seo.rule.view", "seo.audit.view", "admin.dashboard.view"],
    { returnTo: "/admin/seo/404-monitor" }
  );

  if (!guard.ok) {
    return <ErrorState message={guard.error} title="Không có quyền truy cập" variant="danger" />;
  }

  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? "1") || 1);

  const list = await listSeo404Logs({
    page,
    pageSize: 25,
    search: params.q
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">404 Monitor</h1>
        <p className="mt-1 text-sm text-zinc-400">
          URL không tồn tại trên site public — bot/spam được lọc; dedupe 60s/path.
        </p>
      </div>

      <Suspense fallback={null}>
        <MonitorFilters searchParams={params} />
      </Suspense>

      <Seo404MonitorList items={list.items} />

      <AdminListPagination
        basePath="/admin/seo/404-monitor"
        page={list.page}
        pageSize={list.pageSize}
        total={list.total}
        totalPages={list.totalPages}
      />
    </div>
  );
}
