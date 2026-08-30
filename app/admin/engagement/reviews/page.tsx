import { Suspense } from "react";
import { AdminListPagination } from "@/components/admin/engagement/AdminListPagination";
import { EngagementAdminHeader } from "@/components/admin/engagement/EngagementAdminHeader";
import { StoryReviewModerationFilters } from "@/components/admin/engagement/StoryReviewModerationFilters";
import { StoryReviewModerationList } from "@/components/admin/engagement/StoryReviewModerationList";
import { ErrorState } from "@/components/ui";
import { getAdminStoryReviewsAction } from "@/lib/admin/story-review-moderation-actions";
import { STORY_REVIEW_AUTO_HIDE_REPORT_THRESHOLD } from "@/lib/reviews/story-review-config";
import { requireAnyPermission } from "@/lib/auth/require-permission";

export const dynamic = "force-dynamic";

type AdminStoryReviewsPageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function AdminStoryReviewsPage({ searchParams }: AdminStoryReviewsPageProps) {
  const guard = await requireAnyPermission(["report.review", "moderation.action.create"], {
    returnTo: "/admin/engagement/reviews"
  });

  if (!guard.ok) {
    return (
      <section className="space-y-6">
        <EngagementAdminHeader title="Không có quyền truy cập" />
        <ErrorState message={guard.error} title="Từ chối truy cập" variant="danger" />
      </section>
    );
  }

  const params = await searchParams;
  const result = await getAdminStoryReviewsAction(params);

  return (
    <section className="space-y-5">
      <EngagementAdminHeader
        description={`Duyệt và ẩn/hiện đánh giá. Tự ẩn khi đạt ${STORY_REVIEW_AUTO_HIDE_REPORT_THRESHOLD} báo cáo. Thao tác được ghi audit.`}
        title="Đánh giá truyện"
      />

      <Suspense fallback={<p className="text-sm text-zinc-500">Đang tải bộ lọc…</p>}>
        <StoryReviewModerationFilters />
      </Suspense>

      {!result.ok ? (
        <ErrorState message={result.error ?? "Không tải được danh sách."} title="Lỗi" />
      ) : (
        <>
          <StoryReviewModerationList items={result.items} />
          <AdminListPagination
            basePath="/admin/engagement/reviews"
            page={result.page}
            pageSize={result.pageSize}
            total={result.total}
            totalPages={result.totalPages}
          />
        </>
      )}
    </section>
  );
}
