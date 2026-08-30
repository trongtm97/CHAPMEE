import { AdminPoliciesPage } from "@/components/admin/policies/AdminPoliciesPage";
import { ErrorState } from "@/components/ui";
import { getPolicyPageStats, listPolicyPages, listPolicyPagesByCanonicalPaths } from "@/lib/policies/policy-pages";
import { parsePolicyListFilters } from "@/lib/policies/parse-policy-filters";
import { requireAnyPermission } from "@/lib/auth/require-permission";
import { SITE_PAGE_REGISTRY } from "@/lib/site-pages/registry";
import { buildAdminPolicyCapabilities } from "@/types/policy-pages";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminSitePagesRoute({ searchParams }: PageProps) {
  const guard = await requireAnyPermission(
    ["policies.view", "content.post.view", "admin.dashboard.view"],
    { returnTo: "/admin/pages" }
  );

  if (!guard.ok) {
    return <ErrorState message={guard.error} title="Không có quyền truy cập" variant="danger" />;
  }

  const query = await searchParams;
  const filters = parsePolicyListFilters(query);
  const capabilities = buildAdminPolicyCapabilities(guard.context.permissions);
  const registryPaths = SITE_PAGE_REGISTRY.map((entry) => entry.publicPath);

  const [listResult, statsResult, registryResult] = await Promise.all([
    listPolicyPages({
      status: filters.status,
      policyType: filters.policyType,
      siteGroup: filters.siteGroup,
      search: filters.search,
      page: filters.page,
      pageSize: filters.pageSize
    }),
    getPolicyPageStats(),
    listPolicyPagesByCanonicalPaths(registryPaths)
  ]);

  const byPath = new Map(
    registryResult.items.map((item) => [item.canonical_path ?? "", item])
  );
  const registryRows = SITE_PAGE_REGISTRY.map((entry) => ({
    entry,
    page: byPath.get(entry.publicPath) ?? null
  }));

  return (
    <section>
      <AdminPoliciesPage
        capabilities={capabilities}
        initialFilters={filters}
        initialItems={listResult.items}
        initialRegistryRows={registryRows}
        initialStats={
          statsResult.stats ?? { total: 0, published: 0, draft: 0, archived: 0 }
        }
        initialTotal={listResult.total}
        loadError={listResult.error}
      />
    </section>
  );
}
