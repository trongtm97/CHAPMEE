import { SeoOverrideForm } from "@/components/admin/seo/SeoOverrideForm";
import { ErrorState } from "@/components/ui";
import { getSeoSettingsRow } from "@/lib/seo/seo-admin-service";
import { requireAnyPermission } from "@/lib/auth/require-permission";
import { buildAdminSeoCapabilities } from "@/types/admin-seo";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ path?: string; noindex?: string }>;
};

export default async function AdminSeoOverrideNewPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const guard = await requireAnyPermission(
    ["seo.rule.view", "seo.audit.view", "admin.dashboard.view"],
    { returnTo: "/admin/seo/overrides/new" }
  );

  if (!guard.ok) {
    return <ErrorState message={guard.error} title="Không có quyền truy cập" variant="danger" />;
  }

  const capabilities = buildAdminSeoCapabilities(guard.context.permissions);
  const settings = await getSeoSettingsRow();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Tạo SEO override</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Nhập path hoặc target_id — preview Google/Social cập nhật theo thời gian thực.
        </p>
      </div>

      <SeoOverrideForm
        canUpdate={capabilities.canUpdateRules}
        defaultNoindex={params.noindex === "1"}
        defaultPath={params.path?.trim() ?? ""}
        siteName={settings?.siteName}
      />
    </div>
  );
}
