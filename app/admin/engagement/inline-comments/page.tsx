import { Suspense } from "react";
import { AdminListPagination } from "@/components/admin/engagement/AdminListPagination";
import { EngagementAdminHeader } from "@/components/admin/engagement/EngagementAdminHeader";
import { InlineCommentModerationFilters } from "@/components/admin/engagement/InlineCommentModerationFilters";
import { InlineCommentModerationList } from "@/components/admin/engagement/InlineCommentModerationList";
import { ErrorState } from "@/components/ui";
import { getAdminInlineCommentsAction } from "@/lib/admin/inline-comment-moderation-actions";
import { INLINE_COMMENT_AUTO_HIDE_REPORT_THRESHOLD } from "@/lib/inline-comments/inline-comment-config";
import { requireAnyPermission } from "@/lib/auth/require-permission";

export const dynamic = "force-dynamic";

type AdminInlineCommentsPageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function AdminInlineCommentsPage({
  searchParams
}: AdminInlineCommentsPageProps) {
  const guard = await requireAnyPermission(["report.review", "moderation.action.create"], {
    returnTo: "/admin/engagement/inline-comments"
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
  const result = await getAdminInlineCommentsAction(params);

  return (
    <section className="space-y-5">
      <EngagementAdminHeader
        description={`Duyệt luồng bình luận theo đoạn. Tự ẩn khi đạt ${INLINE_COMMENT_AUTO_HIDE_REPORT_THRESHOLD} báo cáo.`}
        title="Bình luận theo đoạn"
      />

      <Suspense fallback={<p className="text-sm text-zinc-500">Đang tải bộ lọc…</p>}>
        <InlineCommentModerationFilters />
      </Suspense>

      {!result.ok ? (
        <ErrorState message={result.error ?? "Không tải được danh sách."} title="Lỗi" />
      ) : (
        <>
          <InlineCommentModerationList items={result.items} />
          <AdminListPagination
            basePath="/admin/engagement/inline-comments"
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
