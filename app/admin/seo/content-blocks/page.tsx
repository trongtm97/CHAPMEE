import Link from "next/link";
import { Suspense } from "react";
import { AdminListPagination } from "@/components/admin/engagement/AdminListPagination";
import { SeoContentBlocksFilters } from "@/components/admin/seo/SeoContentBlocksFilters";
import { SeoContentBlocksList } from "@/components/admin/seo/SeoContentBlocksList";
import { Button, ErrorState } from "@/components/ui";
import { requireAnyPermission } from "@/lib/auth/require-permission";
import { listSeoContentBlocks } from "@/lib/seo/seo-content-service";
import { buildAdminSeoCapabilities } from "@/types/admin-seo";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function AdminSeoContentBlocksPage({ searchParams }: PageProps) {
  const guard = await requireAnyPermission(
    ["seo.rule.view", "seo.audit.view", "admin.dashboard.view"],
    { returnTo: "/admin/seo/content-blocks" }
  );

  if (!guard.ok) {
    return <ErrorState message={guard.error} title="Không có quyền truy cập" variant="danger" />;
  }

  const capabilities = buildAdminSeoCapabilities(guard.context.permissions);
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? "1") || 1);

  const list = await listSeoContentBlocks({
    page,
    pageSize: 20,
    pageType: params.pageType,
    status: params.status,
    search: params.q
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">SEO Content Blocks</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Markdown server-rendered trước footer — H2/H3, FAQ và internal links.
          </p>
        </div>
        {capabilities.canUpdateRules ? (
          <Link href="/admin/seo/content-blocks/new">
            <Button>Tạo block</Button>
          </Link>
        ) : null}
      </div>

      <Suspense fallback={<p className="text-sm text-zinc-500">Đang tải bộ lọc…</p>}>
        <SeoContentBlocksFilters />
      </Suspense>

      <SeoContentBlocksList canUpdate={capabilities.canUpdateRules} items={list.items} />

      <AdminListPagination
        basePath="/admin/seo/content-blocks"
        page={list.page}
        pageSize={list.pageSize}
        total={list.total}
        totalPages={list.totalPages}
      />
    </div>
  );
}
