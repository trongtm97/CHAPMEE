import Link from "next/link";
import { SeoPublicPagesPanel } from "@/components/admin/seo/SeoPublicPagesPanel";
import { ErrorState } from "@/components/ui";
import { requireAnyPermission } from "@/lib/auth/require-permission";
import { SEO_PUBLIC_ROUTE_PRESETS } from "@/lib/seo/public-route-presets";
import { getSeoOverridesForPaths } from "@/lib/seo/seo-admin-service";
import { buildAdminSeoCapabilities } from "@/types/admin-seo";

export const dynamic = "force-dynamic";

export default async function AdminSeoPublicPagesPage() {
  const guard = await requireAnyPermission(
    ["seo.rule.view", "seo.audit.view", "admin.dashboard.view"],
    { returnTo: "/admin/seo/pages" }
  );

  if (!guard.ok) {
    return <ErrorState message={guard.error} title="Không có quyền truy cập" variant="danger" />;
  }

  const capabilities = buildAdminSeoCapabilities(guard.context.permissions);
  const paths = SEO_PUBLIC_ROUTE_PRESETS.map((preset) => preset.path);
  const overridesByPath = await getSeoOverridesForPaths(paths);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">SEO theo trang</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Quản lý title, meta description và ảnh chia sẻ cho từng URL công khai — giống RankMath.
          </p>
        </div>
        <Link
          className="rounded-lg border border-white/10 px-3 py-2 text-sm font-semibold text-zinc-300 hover:bg-white/[0.04]"
          href="/admin/seo"
        >
          ← SEO Center
        </Link>
      </div>

      <SeoPublicPagesPanel canUpdate={capabilities.canUpdateRules} overridesByPath={overridesByPath} />
    </div>
  );
}
