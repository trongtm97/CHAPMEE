import { createClient } from "@/lib/supabase/server";
import {
  canResubmitQualityStatus,
  isNeedsActionStatus,
  qualityReasonLabel,
  qualityStatusLabel
} from "@/lib/content-quality/labels";
import { studioPath } from "@/lib/studio/constants";
import { getQualityMonetizationImpact, getQualityRefundHistory } from "@/lib/admin/get-quality-monetization-impact";
import type { CreatorProfile } from "@/lib/creator/getCreatorProfile";
import type {
  ContentQualityDetail,
  ContentQualityListItem,
  ContentQualityListTab,
  ContentQualityReasonCode,
  ContentQualityReviewRecord,
  ContentQualitySignalSnapshot,
  ContentQualityStatus
} from "@/types/content-quality";

export type AuthorContentHealthResult = {
  items: ContentQualityListItem[];
  counts: Record<ContentQualityListTab, number>;
  needsActionCount: number;
};

function mapReview(row: Record<string, unknown>): ContentQualityReviewRecord {
  return {
    actionTaken: (row.action_taken as ContentQualityReviewRecord["actionTaken"]) ?? null,
    attemptNumber: Number(row.attempt_number ?? 0),
    authorNote: (row.author_note as string) ?? null,
    chapterId: (row.chapter_id as string) ?? null,
    createdAt: String(row.created_at),
    id: String(row.id),
    moderatorNote: (row.moderator_note as string) ?? null,
    reasonCodes: (row.reason_codes as ContentQualityReasonCode[]) ?? [],
    reviewedBy: (row.reviewed_by as string) ?? null,
    signalSnapshot: (row.signal_snapshot as ContentQualitySignalSnapshot) ?? null,
    status: row.status as ContentQualityStatus,
    storyId: (row.story_id as string) ?? null,
    targetId: String(row.target_id),
    targetType: row.target_type as ContentQualityReviewRecord["targetType"],
    updatedAt: String(row.updated_at)
  };
}

function recommendedActions(
  status: ContentQualityStatus,
  attempt: number,
  reasons: ContentQualityReasonCode[]
): string[] {
  const actions: string[] = [];

  if (reasons.includes("too_short_content")) {
    actions.push("Bổ sung mô tả hoặc nội dung chương đủ dài.");
  }

  if (reasons.includes("repeated_reports")) {
    actions.push("Rà soát nội dung theo báo cáo và quy định cộng đồng.");
  }

  if (reasons.includes("high_early_drop_rate")) {
    actions.push("Cải thiện mở đầu chương để giữ chân người đọc.");
  }

  if (reasons.includes("incomplete_story")) {
    actions.push("Hoàn thiện tiêu đề, mô tả và ảnh bìa.");
  }

  if (actions.length === 0) {
    actions.push("Chỉnh nội dung theo lý do cảnh báo, sau đó gửi xét duyệt lại.");
  }

  if (attempt === 2) {
    actions.push(
      "Đây là cảnh báo lần 2 — nếu lần gửi lại tiếp theo vẫn bị xác nhận chất lượng thấp, truyện có thể bị ẩn vĩnh viễn và tắt kiếm tiền."
    );
  }

  if (status === "permanently_hidden_low_quality") {
    actions.push(
      "Truyện không còn hiển thị công khai. Bạn có thể gửi khiếu nại một lần để admin xem xét."
    );
  }

  return actions;
}

function warningMessage(status: ContentQualityStatus, attempt: number) {
  if (status === "permanently_hidden_low_quality") {
    return "Truyện đã bị ẩn vĩnh viễn khỏi công khai và kiếm tiền đã tắt. Doanh thu trước đó vẫn được giữ trong sổ sách.";
  }

  if (attempt >= 2) {
    return `Truyện đang ở ${qualityStatusLabel(status)}. Nếu sau lần gửi lại tiếp theo nội dung vẫn bị xác nhận chất lượng thấp, truyện có thể bị ẩn vĩnh viễn và tắt kiếm tiền.`;
  }

  if (attempt === 1) {
    return "Đây là cảnh báo lần đầu. Hãy sửa theo lý do bên dưới và gửi xét duyệt lại.";
  }

  return null;
}

function tabForStatus(status: ContentQualityStatus): ContentQualityListTab {
  if (status === "permanently_hidden_low_quality") {
    return "permanently_hidden";
  }

  if (status === "restored") {
    return "restored";
  }

  if (
    status === "pending_quality_review" ||
    status === "appealed" ||
    status === "low_quality_final_review"
  ) {
    return "in_review";
  }

  if (isNeedsActionStatus(status)) {
    return "needs_action";
  }

  return "all";
}

export async function getAuthorContentHealth(
  creatorProfile: CreatorProfile,
  tab: ContentQualityListTab = "all"
): Promise<AuthorContentHealthResult> {
  const supabase = await createClient();

  const { data: stories } = await supabase
    .from("stories")
    .select(
      "id, title, slug, quality_status, low_quality_attempt_count, monetization_disabled_by_quality, quality_updated_at, updated_at"
    )
    .eq("creator_id", creatorProfile.id)
    .neq("quality_status", "good")
    .order("quality_updated_at", { ascending: false, nullsFirst: false });

  const storyRows = stories ?? [];

  const { data: latestReviews } = await supabase
    .from("content_quality_reviews")
    .select("*")
    .eq("author_id", creatorProfile.id)
    .order("created_at", { ascending: false });

  const latestByStory = new Map<string, Record<string, unknown>>();

  for (const review of latestReviews ?? []) {
    const storyId = review.story_id as string;
    if (storyId && !latestByStory.has(storyId)) {
      latestByStory.set(storyId, review as Record<string, unknown>);
    }
  }

  const items: ContentQualityListItem[] = storyRows.map((story) => {
    const status = story.quality_status as ContentQualityStatus;
    const attempt = story.low_quality_attempt_count ?? 0;
    const latest = latestByStory.get(story.id);
    const reasonCodes = (latest?.reason_codes as ContentQualityReasonCode[]) ?? [];
    const primaryCode = reasonCodes[0] ?? null;

    return {
      attemptCount: attempt,
      canAppeal:
        status === "permanently_hidden_low_quality" &&
        attempt >= 3,
      canResubmit: canResubmitQualityStatus(status, attempt),
      chapterId: null,
      editHref: studioPath(`/stories/${story.id}/edit`),
      id: story.id,
      monetizationDisabled: Boolean(story.monetization_disabled_by_quality),
      primaryReasonCode: primaryCode,
      primaryReasonLabel: primaryCode ? qualityReasonLabel(primaryCode) : null,
      qualityStatus: status,
      reasonCodes,
      storyId: story.id,
      subtitle: null,
      targetId: story.id,
      targetType: "story",
      title: story.title,
      warnedAt:
        (story.quality_updated_at as string) ??
        (story.updated_at as string) ??
        new Date().toISOString()
    };
  });

  const counts: Record<ContentQualityListTab, number> = {
    all: items.length,
    in_review: items.filter((i) => tabForStatus(i.qualityStatus) === "in_review")
      .length,
    needs_action: items.filter(
      (i) => tabForStatus(i.qualityStatus) === "needs_action"
    ).length,
    permanently_hidden: items.filter(
      (i) => tabForStatus(i.qualityStatus) === "permanently_hidden"
    ).length,
    restored: items.filter((i) => tabForStatus(i.qualityStatus) === "restored").length
  };

  const filtered =
    tab === "all"
      ? items
      : items.filter((item) => tabForStatus(item.qualityStatus) === tab);

  return {
    counts,
    items: filtered,
    needsActionCount: counts.needs_action
  };
}

export async function getAuthorContentQualityDetail(
  creatorProfile: CreatorProfile,
  storyId: string
): Promise<ContentQualityDetail | null> {
  const supabase = await createClient();

  const { data: story } = await supabase
    .from("stories")
    .select(
      "id, title, slug, quality_status, low_quality_attempt_count, monetization_disabled_by_quality, monetization_status, free_access_set_at, quality_updated_at, updated_at, creator_id"
    )
    .eq("id", storyId)
    .eq("creator_id", creatorProfile.id)
    .maybeSingle();

  if (!story) {
    return null;
  }

  const { data: historyRows } = await supabase
    .from("content_quality_reviews")
    .select("*")
    .eq("story_id", storyId)
    .order("created_at", { ascending: false });

  const history = (historyRows ?? []).map((row) =>
    mapReview(row as Record<string, unknown>)
  );

  const latest = history[0];
  const status = story.quality_status as ContentQualityStatus;
  const attempt = story.low_quality_attempt_count ?? 0;
  const reasonCodes = latest?.reasonCodes ?? [];

  const [impactResult, refundHistory] = await Promise.all([
    getQualityMonetizationImpact({ storyId }),
    getQualityRefundHistory({ storyId, limit: 1 })
  ]);

  const latestRefund = refundHistory.batches[0] ?? null;
  const impact = impactResult.data;

  return {
    attemptCount: attempt,
    canAppeal: status === "permanently_hidden_low_quality",
    canResubmit: canResubmitQualityStatus(status, attempt),
    chapterId: null,
    editHref: studioPath(`/stories/${story.id}/edit`),
    history,
    id: story.id,
    monetizationDisabled: Boolean(story.monetization_disabled_by_quality),
    moderatorNote: latest?.moderatorNote ?? null,
    primaryReasonCode: reasonCodes[0] ?? null,
    primaryReasonLabel: reasonCodes[0] ? qualityReasonLabel(reasonCodes[0]) : null,
    qualityStatus: status,
    reasonCodes,
    recommendedActions: recommendedActions(status, attempt, reasonCodes),
    signalSnapshot: latest?.signalSnapshot ?? null,
    storyId: story.id,
    subtitle: null,
    targetId: story.id,
    targetType: "story",
    title: story.title,
    warnedAt:
      story.quality_updated_at ?? story.updated_at ?? new Date().toISOString(),
    warningMessage: warningMessage(status, attempt),
    monetizationImpact: impact
      ? {
          monetizationStatus: impact.monetizationStatus,
          buyerCount: impact.buyerCount,
          totalCoinCollected: impact.totalCoinCollected,
          totalCoinRefunded: impact.totalCoinRefunded,
          creatorRevenueVnd: impact.creatorRevenueVnd,
          freeAccessSetAt: (story.free_access_set_at as string | null) ?? null,
          completedRefundBatchCount: impact.completedRefundBatchCount,
          authorNote: latestRefund?.authorNote ?? latest?.moderatorNote ?? null
        }
      : null
  };
}

export async function getAuthorNeedsActionQualityCount(
  creatorProfile: CreatorProfile
) {
  const supabase = await createClient();
  const { count } = await supabase
    .from("stories")
    .select("id", { count: "exact", head: true })
    .eq("creator_id", creatorProfile.id)
    .in("quality_status", [
      "needs_attention",
      "low_quality_warning_1",
      "low_quality_warning_2",
      "low_quality_final_review"
    ]);

  return count ?? 0;
}
