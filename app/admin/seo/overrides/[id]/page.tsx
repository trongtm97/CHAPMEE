import { notFound } from "next/navigation";
import { SeoOverrideForm } from "@/components/admin/seo/SeoOverrideForm";
import { ErrorState } from "@/components/ui";
import { getSeoOverrideById, getSeoSettingsRow } from "@/lib/seo/seo-admin-service";
import { requireAnyPermission } from "@/lib/auth/require-permission";
import { buildAdminSeoCapabilities } from "@/types/admin-seo";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminSeoOverrideEditPage({ params }: PageProps) {
  const guard = await requireAnyPermission(
    ["seo.rule.view", "seo.audit.view", "admin.dashboard.view"],
    { returnTo: "/admin/seo/overrides" }
  );

  if (!guard.ok) {
    return <ErrorState message={guard.error} title="Không có quyền truy cập" variant="danger" />;
  }

  const { id } = await params;
  const [override, settings] = await Promise.all([getSeoOverrideById(id), getSeoSettingsRow()]);

  if (!override) {
    notFound();
  }

  const capabilities = buildAdminSeoCapabilities(guard.context.permissions);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Sửa SEO override</h1>
        <p className="mt-1 font-mono text-sm text-zinc-500">{override.id}</p>
      </div>

      <SeoOverrideForm
        canUpdate={capabilities.canUpdateRules}
        initial={override}
        siteName={settings?.siteName}
      />
    </div>
  );
}
