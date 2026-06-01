import { AdminSeoControlCenterPage } from "@/components/admin/seo/AdminSeoControlCenterPage";
import { ErrorState } from "@/components/ui";
import { loadSeoDashboardAction } from "@/lib/admin/seo-actions";
import { requireAnyPermission } from "@/lib/auth/require-permission";
import { buildAdminSeoCapabilities, type SeoControlTabId } from "@/types/admin-seo";

export const dynamic = "force-dynamic";

const VALID_TABS: SeoControlTabId[] = [
  "overview",
  "taxonomy",
  "rules",
  "metadata",
  "headings",
  "sitemap",
  "robots",
  "audit",
  "logs",
  "urls"
];

type PageProps = {
  searchParams: Promise<{ tab?: string }>;
};

export default async function AdminSeoDashboardRoute({ searchParams }: PageProps) {
  const guard = await requireAnyPermission(
    ["seo.rule.view", "seo.audit.view", "admin.dashboard.view"],
    { returnTo: "/admin/seo" }
  );

  if (!guard.ok) {
    return <ErrorState message={guard.error} title="Không có quyền truy cập" variant="danger" />;
  }

  const capabilities = buildAdminSeoCapabilities(guard.context.permissions);
  const data = await loadSeoDashboardAction();

  if (!capabilities.canViewRules && !capabilities.canViewAudit) {
    return <ErrorState message="Bạn không có quyền xem SEO panel." title="Không có quyền" variant="danger" />;
  }

  const params = await searchParams;
  const tabParam = params.tab ?? "overview";
  const initialTab = VALID_TABS.includes(tabParam as SeoControlTabId)
    ? (tabParam as SeoControlTabId)
    : "overview";

  return (
    <AdminSeoControlCenterPage
      capabilities={capabilities}
      initialData={data}
      initialTab={initialTab}
    />
  );
}
