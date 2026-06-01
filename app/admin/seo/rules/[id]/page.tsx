import Link from "next/link";
import { notFound } from "next/navigation";
import { SeoRuleForm } from "@/components/admin/seo/SeoRuleForm";
import { ErrorState } from "@/components/ui";
import { getSeoRuleById } from "@/lib/seo/rules";
import { requireAnyPermission } from "@/lib/auth/require-permission";
import { buildAdminSeoCapabilities } from "@/types/admin-seo";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminSeoRuleEditRoute({ params }: PageProps) {
  const guard = await requireAnyPermission(
    ["seo.rule.view", "admin.dashboard.view"],
    { returnTo: "/admin/seo/rules" }
  );

  if (!guard.ok) {
    return <ErrorState message={guard.error} title="Không có quyền truy cập" variant="danger" />;
  }

  const { id } = await params;
  const result = await getSeoRuleById(id);

  if (result.error) {
    return <ErrorState message={result.error} title="Không thể tải rule" variant="danger" />;
  }

  if (!result.item) {
    notFound();
  }

  const capabilities = buildAdminSeoCapabilities(guard.context.permissions);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link className="text-sm text-zinc-400 hover:text-zinc-200" href="/admin/seo?tab=rules">
          ← Quay lại quy tắc SEO
        </Link>
        <h1 className="text-2xl font-semibold text-white">Sửa SEO rule</h1>
      </header>
      <SeoRuleForm capabilities={capabilities} rule={result.item} />
    </div>
  );
}
