import { SeoContentBlockForm } from "@/components/admin/seo/SeoContentBlockForm";
import { ErrorState } from "@/components/ui";
import { requireAnyPermission } from "@/lib/auth/require-permission";
import { buildAdminSeoCapabilities } from "@/types/admin-seo";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ routePath?: string; pageType?: string }>;
};

export default async function AdminSeoContentBlockNewPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const guard = await requireAnyPermission(
    ["seo.rule.view", "seo.audit.view", "admin.dashboard.view"],
    { returnTo: "/admin/seo/content-blocks/new" }
  );

  if (!guard.ok) {
    return <ErrorState message={guard.error} title="Không có quyền truy cập" variant="danger" />;
  }

  const capabilities = buildAdminSeoCapabilities(guard.context.permissions);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Tạo SEO content block</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Nội dung hiển thị dưới main content, trước footer — không dùng H1.
        </p>
      </div>
      <SeoContentBlockForm
        canUpdate={capabilities.canUpdateRules}
        defaultPageType={params.pageType?.trim()}
        defaultRoutePath={params.routePath?.trim()}
      />
    </div>
  );
}
