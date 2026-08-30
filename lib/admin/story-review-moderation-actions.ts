"use server";

import { revalidatePath } from "next/cache";
import { adminListMeta, parseAdminListParams } from "@/lib/admin/admin-list-params";
import { logAdminAction } from "@/lib/audit/log-admin-action";
import {
  getAdminStoryReviewsPaged,
  setStoryReviewModerationStatus
} from "@/lib/reviews/story-reviews";
import { requireAnyPermission } from "@/lib/auth/require-permission";

export type AdminStoryReviewListFilters = {
  status?: string;
  reported?: string;
  rating?: string;
  storyQ?: string;
  userQ?: string;
  page?: string;
  pageSize?: string;
};

function parseReviewStatus(
  value?: string
): "visible" | "hidden" | "pending" | "all" {
  if (value === "visible" || value === "hidden" || value === "pending") {
    return value;
  }
  return "all";
}

export async function getAdminStoryReviewsAction(filters: AdminStoryReviewListFilters = {}) {
  const guard = await requireAnyPermission(["report.review", "moderation.action.create"], {
    returnTo: "/admin/engagement/reviews"
  });
  if (!guard.ok) {
    return {
      ok: false as const,
      error: guard.error,
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
      totalPages: 1
    };
  }

  const { page, pageSize } = parseAdminListParams(filters);
  const status = parseReviewStatus(filters.status);
  const minRating = Number(filters.rating);
  const { items, total } = await getAdminStoryReviewsPaged({
    status,
    reportedOnly: filters.reported === "1",
    minRating: minRating >= 1 && minRating <= 5 ? minRating : undefined,
    storyQ: filters.storyQ,
    userQ: filters.userQ,
    page,
    pageSize
  });

  const meta = adminListMeta(total, page, pageSize);

  return {
    ok: true as const,
    error: null,
    items,
    ...meta
  };
}

export async function moderateStoryReviewAction(formData: FormData) {
  const guard = await requireAnyPermission(["report.review", "moderation.action.create"], {
    returnTo: "/admin/engagement/reviews"
  });
  if (!guard.ok) {
    return { ok: false as const, message: guard.error };
  }

  const reviewId = String(formData.get("reviewId") ?? "").trim();
  const nextStatus = String(formData.get("status") ?? "").trim();

  if (!reviewId || (nextStatus !== "visible" && nextStatus !== "hidden" && nextStatus !== "pending")) {
    return { ok: false as const, message: "Dữ liệu không hợp lệ." };
  }

  const result = await setStoryReviewModerationStatus(
    reviewId,
    nextStatus as "visible" | "hidden" | "pending"
  );

  if (!result.ok) {
    return { ok: false as const, message: result.error ?? "Không thể cập nhật." };
  }

  await logAdminAction({
    action: nextStatus === "hidden" ? "reported_content_hidden" : "reported_content_restored",
    actorId: guard.context.userId,
    targetType: "story_review",
    targetId: reviewId,
    metadata: { status: nextStatus, storyId: result.storyId }
  });

  revalidatePath("/admin/engagement/reviews");
  revalidatePath("/admin/engagement");
  if (result.storySlug) {
    revalidatePath(`/truyen/${result.storySlug}`);
  }
  return {
    ok: true as const,
    message:
      nextStatus === "hidden"
        ? "Đã ẩn đánh giá."
        : nextStatus === "pending"
          ? "Đã chuyển chờ duyệt."
          : "Đã hiện lại đánh giá."
  };
}
