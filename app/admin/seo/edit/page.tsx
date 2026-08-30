import { redirect } from "next/navigation";
import { ErrorState } from "@/components/ui";
import { requireAnyPermission } from "@/lib/auth/require-permission";
import { findSeoOverrideByPath } from "@/lib/seo/seo-admin-service";
import { isPrivateSeoPath, normalizeSeoPath } from "@/lib/seo/seo-validation";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ path?: string }>;
};

export default async function AdminSeoQuickEditPage({ searchParams }: PageProps) {
  const guard = await requireAnyPermission(
    ["seo.rule.view", "seo.audit.view", "admin.dashboard.view"],
    { returnTo: "/admin/seo/pages" }
  );

  if (!guard.ok) {
    return <ErrorState message={guard.error} title="Không có quyền truy cập" variant="danger" />;
  }

  const params = await searchParams;
  const path = normalizeSeoPath(params.path?.trim() ?? "");

  if (!path) {
    redirect("/admin/seo/pages");
  }

  if (isPrivateSeoPath(path)) {
    return (
      <ErrorState
        message="Path thuộc khu vực private (admin, studio, login…) — không nên chỉnh SEO công khai."
        title="Path không hợp lệ"
        variant="warning"
      />
    );
  }

  const existing = await findSeoOverrideByPath(path);
  if (existing) {
    redirect(`/admin/seo/overrides/${existing.id}`);
  }

  redirect(`/admin/seo/overrides/new?path=${encodeURIComponent(path)}`);
}
