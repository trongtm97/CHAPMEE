import { notFound } from "next/navigation";
import { SeoContentBlockForm } from "@/components/admin/seo/SeoContentBlockForm";
import { ErrorState } from "@/components/ui";
import { getSeoContentBlockById } from "@/lib/seo/seo-content-service";
import { requireAnyPermission } from "@/lib/auth/require-permission";
import { buildAdminSeoCapabilities } from "@/types/admin-seo";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminSeoContentBlockEditPage({ params }: PageProps) {
  const guard = await requireAnyPermission(
    ["seo.rule.view", "seo.audit.view", "admin.dashboard.view"],
    { returnTo: "/admin/seo/content-blocks" }
  );

  if (!guard.ok) {
    return <ErrorState message={guard.error} title="Không có quyền truy cập" variant="danger" />;
  }

  const { id } = await params;
  const block = await getSeoContentBlockById(id);
  if (!block) {
    notFound();
  }

  const capabilities = buildAdminSeoCapabilities(guard.context.permissions);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Sửa SEO content block</h1>
        <p className="mt-1 font-mono text-sm text-zinc-500">{block.id}</p>
      </div>
      <SeoContentBlockForm canUpdate={capabilities.canUpdateRules} initial={block} />
    </div>
  );
}
