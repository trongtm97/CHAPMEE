import Link from "next/link";
import { AdminStoryCompletionReviewsPage } from "@/components/admin/AdminStoryCompletionReviewsPage";
import { ErrorState } from "@/components/ui";
import {
  getStoryCompletionReviewSummary,
  getStoryCompletionReviews
} from "@/lib/admin/get-story-completion-reviews";
import { requireAnyPermission } from "@/lib/auth/require-permission";
import type {
  StoryCompletionReviewFilterStatus,
  StoryCompletionReviewSort
} from "@/types/story-completion";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function readString(
  params: Record<string, string | string[] | undefined>,
  key: string
) {
  const value = params[key];
  return typeof value === "string" ? value : "";
}

function readStatus(value: string): StoryCompletionReviewFilterStatus {
  if (
    value === "pending_review" ||
    value === "approved" ||
    value === "rejected"
  ) {
    return value;
  }
  return "all";
}

function readSort(value: string): StoryCompletionReviewSort {
  if (value === "locked_revenue_desc" || value === "story_updated_desc") {
    return value;
  }
  return "requested_desc";
}

export default async function AdminStoryCompletionReviewsRoute({
  searchParams
}: PageProps) {
  const guard = await requireAnyPermission(["finance.dashboard.view"], {
    returnTo: "/admin/monetization/completion-reviews"
  });

  if (!guard.ok) {
    return (
      <section className="space-y-6">
        <ErrorState message={guard.error} title="Không có quyền truy cập" />
      </section>
    );
  }

  const query = await searchParams;
  const status = readStatus(readString(query, "status"));
  const sort = readSort(readString(query, "sort"));
  const search = readString(query, "search");
  const page = Math.max(1, Number(readString(query, "page") || "1"));
  const pageSizeRaw = Number(readString(query, "pageSize") || "10");
  const pageSize = pageSizeRaw === 25 || pageSizeRaw === 50 ? pageSizeRaw : 10;

  let loadError = false;
  let items: Awaited<ReturnType<typeof getStoryCompletionReviews>>["items"] = [];
  let total = 0;
  let summary = await getStoryCompletionReviewSummary();

  try {
    const [listResult, summaryResult] = await Promise.all([
      getStoryCompletionReviews({ page, pageSize, search, status, sort }),
      getStoryCompletionReviewSummary()
    ]);
    if (listResult.error) {
      loadError = true;
    } else {
      items = listResult.items;
      total = listResult.total;
    }
    summary = summaryResult;
  } catch {
    loadError = true;
  }

  return (
    <section className="space-y-6">
      <div>
        <Link className="text-sm text-cyan-300 hover:text-cyan-200" href="/admin">
          ← Admin
        </Link>
        <h1 className="mt-3 text-3xl font-bold text-white">Duyệt hoàn thành truyện</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Xác nhận truyện bán trọn bộ đã hoàn thành để mở khóa doanh thu đang giữ cho tác giả.
        </p>
      </div>
      <AdminStoryCompletionReviewsPage
        initialItems={items}
        initialPage={page}
        initialPageSize={pageSize}
        initialSearch={search}
        initialSort={sort}
        initialStatus={status}
        initialTotal={total}
        loadError={loadError}
        summary={summary}
      />
    </section>
  );
}
