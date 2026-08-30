import { SeoRedirectForm } from "@/components/admin/seo/SeoRedirectForm";
import { ErrorState } from "@/components/ui";
import { requireAnyPermission } from "@/lib/auth/require-permission";
import { buildAdminSeoCapabilities } from "@/types/admin-seo";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ source_path?: string }>;
};

export default async function AdminSeoRedirectNewPage({ searchParams }: PageProps) {
  const guard = await requireAnyPermission(
    ["seo.rule.view", "seo.audit.view", "admin.dashboard.view"],
    { returnTo: "/admin/seo/redirects/new" }
  );

  if (!guard.ok) {
    return <ErrorState message={guard.error} title="Không có quyền truy cập" variant="danger" />;
  }

  const capabilities = buildAdminSeoCapabilities(guard.context.permissions);
  const params = await searchParams;
  const prefilledSourcePath = params.source_path?.trim() ?? "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Tạo redirect</h1>
        {prefilledSourcePath ? (
          <p className="mt-1 font-mono text-sm text-zinc-400">
            Từ 404 monitor: {prefilledSourcePath}
          </p>
        ) : (
          <p className="mt-1 text-sm text-zinc-400">source_path phải bắt đầu bằng /.</p>
        )}
      </div>
      <SeoRedirectForm
        canUpdate={capabilities.canUpdateRules}
        prefilledSourcePath={prefilledSourcePath}
      />
    </div>
  );
}
