import Link from "next/link";
import { Suspense } from "react";
import { AdminRedirectsHub } from "@/components/admin/seo/AdminRedirectsHub";
import { ErrorState } from "@/components/ui";
import { loadUrlAdminDashboard } from "@/lib/admin/url-seo-data";
import { requireAnyPermission } from "@/lib/auth/require-permission";
import { listSeoRedirects } from "@/lib/seo/redirect-service";
import { isSeoRedirectStatusCode } from "@/lib/seo/seo-validation";
import { buildAdminSeoCapabilities } from "@/types/admin-seo";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

function RedirectsHubFallback() {
  return <p className="text-sm text-zinc-500">Đang tải redirect manager…</p>;
}

export default async function AdminSeoRedirectsPage({ searchParams }: PageProps) {
  const guard = await requireAnyPermission(
    ["seo.rule.view", "seo.audit.view", "admin.dashboard.view"],
    { returnTo: "/admin/seo/redirects" }
  );

  if (!guard.ok) {
    return <ErrorState message={guard.error} title="Không có quyền truy cập" variant="danger" />;
  }

  const capabilities = buildAdminSeoCapabilities(guard.context.permissions);
  const params = await searchParams;
  const tab = params.tab === "slug" ? "slug" : "manual";
  const page = Math.max(1, Number(params.page ?? "1") || 1);
  const enabledParam = params.enabled;
  const enabled =
    enabledParam === "1" ? true : enabledParam === "0" ? false : null;

  const statusCodeParam = params.statusCode ? Number(params.statusCode) : undefined;

  const [list, urlData] = await Promise.all([
    listSeoRedirects({
      page,
      pageSize: 20,
      enabled,
      statusCode:
        statusCodeParam != null && isSeoRedirectStatusCode(statusCodeParam)
          ? statusCodeParam
          : undefined,
      search: params.q
    }),
    loadUrlAdminDashboard()
  ]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Redirect Manager</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Gộp redirect thủ công và redirect đổi slug — một nơi quản lý như RankMath.
          </p>
        </div>
        <Link
          className="rounded-lg border border-white/10 px-3 py-2 text-sm font-semibold text-zinc-300 hover:bg-white/[0.04]"
          href="/admin/seo"
        >
          ← SEO Center
        </Link>
      </div>

      {urlData.error ? (
        <ErrorState message={urlData.error} title="Không tải url_redirects" variant="warning" />
      ) : null}

      <Suspense fallback={<RedirectsHubFallback />}>
        <AdminRedirectsHub
          canUpdate={capabilities.canUpdateRules}
          seoRedirects={list}
          tab={tab}
          urlData={urlData}
        />
      </Suspense>
    </div>
  );
}
