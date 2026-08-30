import { EngagementOverviewDashboard } from "@/components/admin/engagement/EngagementOverviewDashboard";
import { EngagementAdminHeader } from "@/components/admin/engagement/EngagementAdminHeader";
import { ErrorState } from "@/components/ui";
import { getEngagementOverviewStats } from "@/lib/admin/engagement-admin";
import { requireAnyPermission } from "@/lib/auth/require-permission";

export const dynamic = "force-dynamic";

export default async function AdminEngagementOverviewPage() {
  const guard = await requireAnyPermission(
    [
      "admin.settings.view",
      "admin.settings.update",
      "report.review",
      "moderation.action.create"
    ],
    { returnTo: "/admin/engagement" }
  );

  if (!guard.ok) {
    return (
      <section className="space-y-6">
        <EngagementAdminHeader
          description="Bạn cần quyền admin hoặc kiểm duyệt để xem trung tâm tương tác."
          title="Không có quyền truy cập"
        />
        <ErrorState message={guard.error} title="Từ chối truy cập" variant="danger" />
      </section>
    );
  }

  const stats = await getEngagementOverviewStats();

  return (
    <section className="space-y-6">
      <EngagementAdminHeader
        description="Tổng quan phản ứng, đánh giá, bình luận đoạn, đề cử và sự kiện bảo mật. Chỉ số từ dữ liệu thật (origin=user / engagement_source=user)."
        title="Trung tâm tương tác đọc"
      />
      <EngagementOverviewDashboard stats={stats} />
    </section>
  );
}
