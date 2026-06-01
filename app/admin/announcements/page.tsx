import { AdminAnnouncementsPage } from "@/components/admin/announcements/AdminAnnouncementsPage";
import { ErrorState } from "@/components/ui";
import { buildAdminAnnouncementCapabilities } from "@/types/admin-announcements";
import { getAnnouncementStats, listAnnouncements } from "@/lib/platform-content/announcements";
import { parseAnnouncementListFilters } from "@/lib/platform-content/parse-announcement-filters";
import { requireAnyPermission } from "@/lib/auth/require-permission";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminAnnouncementsRoute({ searchParams }: PageProps) {
  const guard = await requireAnyPermission(
    ["platform.announcement.view", "admin.dashboard.view"],
    { returnTo: "/admin/announcements" }
  );

  if (!guard.ok) {
    return <ErrorState message={guard.error} title="Không có quyền truy cập" variant="danger" />;
  }

  const query = await searchParams;
  const filters = parseAnnouncementListFilters(query);
  const capabilities = buildAdminAnnouncementCapabilities(guard.context.permissions);
  const [listResult, statsResult] = await Promise.all([
    listAnnouncements(filters),
    getAnnouncementStats()
  ]);

  return (
    <section>
      <AdminAnnouncementsPage
        capabilities={capabilities}
        initialFilters={filters}
        initialItems={listResult.items}
        initialStats={
          statsResult.stats ?? {
            total: 0,
            published: 0,
            scheduled: 0,
            draft: 0,
            hidden: 0,
            archived: 0,
            seoIssues: 0
          }
        }
        initialTotal={listResult.total}
        loadError={listResult.error}
      />
    </section>
  );
}
