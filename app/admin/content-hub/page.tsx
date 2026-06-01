import { AdminContentPostsPage } from "@/components/admin/content-posts/AdminContentPostsPage";
import { ErrorState } from "@/components/ui";
import { buildAdminContentPostCapabilities } from "@/types/admin-content-posts";
import { getContentPostStats, listContentPosts } from "@/lib/platform-content/content-posts";
import { parseContentPostListFilters } from "@/lib/platform-content/parse-post-filters";
import { requireAnyPermission } from "@/lib/auth/require-permission";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminContentPostsRoute({ searchParams }: PageProps) {
  const guard = await requireAnyPermission(
    ["content.post.view", "admin.dashboard.view"],
    { returnTo: "/admin/content-hub" }
  );

  if (!guard.ok) {
    return <ErrorState message={guard.error} title="Không có quyền truy cập" variant="danger" />;
  }

  const query = await searchParams;
  const filters = parseContentPostListFilters(query);
  const capabilities = buildAdminContentPostCapabilities(guard.context.permissions);
  const [listResult, statsResult] = await Promise.all([
    listContentPosts(filters),
    getContentPostStats()
  ]);

  return (
    <section>
      <AdminContentPostsPage
        capabilities={capabilities}
        initialFilters={filters}
        initialItems={listResult.items}
        initialStats={
          statsResult.stats ?? {
            total: 0,
            published: 0,
            draft: 0,
            scheduled: 0,
            seoIssues: 0,
            noindex: 0,
            views30d: 0
          }
        }
        initialTotal={listResult.total}
        loadError={listResult.error}
      />
    </section>
  );
}
