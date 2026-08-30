import Link from "next/link";
import { Suspense } from "react";
import { AdminListPagination } from "@/components/admin/engagement/AdminListPagination";
import { SeoOverridesFilters } from "@/components/admin/seo/SeoOverridesFilters";
import { SeoOverridesList } from "@/components/admin/seo/SeoOverridesList";
import { Button, ErrorState } from "@/components/ui";
import { requireAnyPermission } from "@/lib/auth/require-permission";
import { listSeoOverrides } from "@/lib/seo/seo-admin-service";
import { buildAdminSeoCapabilities } from "@/types/admin-seo";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function AdminSeoOverridesPage({ searchParams }: PageProps) {
  const guard = await requireAnyPermission(
    ["seo.rule.view", "seo.audit.view", "admin.dashboard.view"],
    { returnTo: "/admin/seo/overrides" }
  );

  if (!guard.ok) {
    return <ErrorState message={guard.error} title="Không có quyền truy cập" variant="danger" />;
  }

  const capabilities = buildAdminSeoCapabilities(guard.context.permissions);
  const params = await searchParams;

  const page = Math.max(1, Number(params.page ?? "1") || 1);
  const enabledParam = params.enabled;
  const enabled =
    enabledParam === "1" ? true : enabledParam === "0" ? false : null;

  const list = await listSeoOverrides({
    page,
    pageSize: 20,
    targetType: params.targetType,
    enabled,
    locale: params.locale,
    search: params.q
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Metadata Overrides</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Override title, description, canonical và OG/Twitter theo route hoặc entity. Chọn nhanh
            trang chủ / danh mục tại{" "}
            <Link className="text-cyan-300 hover:text-cyan-200" href="/admin/seo/pages">
              SEO theo trang
            </Link>
            .
          </p>
        </div>
        {capabilities.canUpdateRules ? (
          <Link href="/admin/seo/overrides/new">
            <Button>Tạo override</Button>
          </Link>
        ) : null}
      </div>

      <Suspense fallback={<p className="text-sm text-zinc-500">Đang tải bộ lọc…</p>}>
        <SeoOverridesFilters />
      </Suspense>

      <SeoOverridesList items={list.items} />

      <AdminListPagination
        basePath="/admin/seo/overrides"
        page={list.page}
        pageSize={list.pageSize}
        total={list.total}
        totalPages={list.totalPages}
      />
    </div>
  );
}
