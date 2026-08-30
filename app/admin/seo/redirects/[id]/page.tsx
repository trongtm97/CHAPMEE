import { notFound } from "next/navigation";
import { SeoRedirectForm } from "@/components/admin/seo/SeoRedirectForm";
import { ErrorState } from "@/components/ui";
import { getSeoRedirectById } from "@/lib/seo/redirect-service";
import { requireAnyPermission } from "@/lib/auth/require-permission";
import { buildAdminSeoCapabilities } from "@/types/admin-seo";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminSeoRedirectEditPage({ params }: PageProps) {
  const guard = await requireAnyPermission(
    ["seo.rule.view", "seo.audit.view", "admin.dashboard.view"],
    { returnTo: "/admin/seo/redirects" }
  );

  if (!guard.ok) {
    return <ErrorState message={guard.error} title="Không có quyền truy cập" variant="danger" />;
  }

  const { id } = await params;
  const redirect = await getSeoRedirectById(id);
  if (!redirect) {
    notFound();
  }

  const capabilities = buildAdminSeoCapabilities(guard.context.permissions);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Sửa redirect</h1>
        <p className="mt-1 font-mono text-sm text-zinc-500">{redirect.id}</p>
        <p className="mt-1 text-sm text-zinc-500">
          Hits: {redirect.hitCount}
          {redirect.lastHitAt ? ` · Last: ${new Date(redirect.lastHitAt).toLocaleString("vi-VN")}` : ""}
        </p>
      </div>
      <SeoRedirectForm canUpdate={capabilities.canUpdateRules} initial={redirect} />
    </div>
  );
}
