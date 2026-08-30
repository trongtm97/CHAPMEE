import { SeoSettingsForm } from "@/components/admin/seo/SeoSettingsForm";
import { ErrorState } from "@/components/ui";
import { loadSeoSettingsAction } from "@/lib/admin/seo-center-actions";
import { resolveMediaAssetPublicUrl } from "@/lib/seo/seo-media";
import { requireAnyPermission } from "@/lib/auth/require-permission";
import { buildAdminSeoCapabilities } from "@/types/admin-seo";

export const dynamic = "force-dynamic";

export default async function AdminSeoSettingsPage() {
  const guard = await requireAnyPermission(
    ["seo.rule.view", "seo.audit.view", "admin.dashboard.view"],
    { returnTo: "/admin/seo/settings" }
  );

  if (!guard.ok) {
    return <ErrorState message={guard.error} title="Không có quyền truy cập" variant="danger" />;
  }

  const capabilities = buildAdminSeoCapabilities(guard.context.permissions);
  const result = await loadSeoSettingsAction();

  if (!result.ok) {
    return <ErrorState message={result.error ?? "Không tải được settings."} title="Lỗi" variant="danger" />;
  }

  const defaultOgPreviewUrl = result.settings?.defaultOgImageAssetId
    ? await resolveMediaAssetPublicUrl(result.settings.defaultOgImageAssetId)
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">SEO Settings</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Cài đặt metadata mặc định toàn site — template title/description, OG image và robots.
        </p>
      </div>

      <SeoSettingsForm
        canUpdate={capabilities.canUpdateRules}
        defaultOgPreviewUrl={defaultOgPreviewUrl}
        initialSettings={result.settings}
      />
    </div>
  );
}
