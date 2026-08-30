"use server";

import { redirect } from "next/navigation";
import { analyticsEvents } from "@/lib/analytics/events";
import { enforceRateLimit } from "@/lib/rate-limit";
import { trackServerEvent } from "@/lib/analytics/trackServerEvent";
import { trackServerReport } from "@/lib/tracking/track-server";
import { mapReportTargetToTrackingItemType } from "@/lib/tracking/resolve-reels-context";
import { ActionAccessError, assertActionAccess } from "@/lib/auth/assert-action-access";
import { reasonCodeToPolicyArea } from "@/lib/moderation/moderation-rules";
import {
  assertCanSubmitReport,
  checkDuplicateOpenReport,
  computeReportPriority,
  formatRateLimitMessage,
  getReporterQuality,
  recordReportSubmitted,
  REPORT_DAILY_LIMIT
} from "@/lib/moderation/reporter-quality";
import { createClient } from "@/lib/data/server";
import type { ReportReasonCode, ReportTargetType } from "@/types/moderation";

export type { ReportReasonCode, ReportTargetType };
export type ReportState = {
  error: string | null;
  success: string | null;
};

const allowedReasons = new Set<ReportReasonCode>([
  "spam",
  "harassment",
  "hate_speech",
  "privacy_violation",
  "sexual_content",
  "violence_self_harm",
  "copyright",
  "impersonation_scam",
  "wrong_age_rating",
  "wrong_taxonomy_tag",
  "missing_content_warning",
  "illegal_content",
  "other"
]);

const allowedTargetTypes = new Set<ReportTargetType>([
  "story",
  "chapter",
  "comment",
  "story_review",
  "inline_comment",
  "inline_comment_thread",
  "community_post",
  "community_group",
  "user",
  "creator"
]);

function isMissingAuthSession(errorMessage: string) {
  return errorMessage.toLowerCase().includes("auth session missing");
}

export async function createReportAction(
  _previousState: ReportState,
  formData: FormData
): Promise<ReportState> {
  const targetType = String(formData.get("target_type") ?? "") as ReportTargetType;
  const targetId = String(formData.get("target_id") ?? "");
  const reasonCode = String(formData.get("reason_code") ?? formData.get("reason") ?? "") as ReportReasonCode;
  const reasonDetail = String(formData.get("reason_detail") ?? formData.get("details") ?? "").trim();
  const returnTo = String(formData.get("return_to") ?? "/");
  const originalWorkUrl = String(formData.get("original_work_url") ?? "").trim();
  const copyrightExplanation = String(formData.get("copyright_explanation") ?? "").trim();

  if (!targetType || !targetId) {
    return { error: "Thiếu thông tin nội dung cần báo cáo.", success: null };
  }

  if (!allowedTargetTypes.has(targetType)) {
    return { error: "Đối tượng báo cáo không hợp lệ.", success: null };
  }

  if (!allowedReasons.has(reasonCode)) {
    return { error: "Vui lòng chọn lý do báo cáo.", success: null };
  }

  if (reasonCode === "copyright" && !originalWorkUrl && !copyrightExplanation) {
    return {
      error: "Báo cáo bản quyền cần link tác phẩm gốc hoặc mô tả rõ ràng.",
      success: null
    };
  }

  const db = await createClient();
  const {
    data: { user },
    error: userError
  } = await db.auth.getUser();

  if (userError && !isMissingAuthSession(userError.message)) {
    return { error: userError.message, success: null };
  }

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  }

  try {
    await assertActionAccess("report.create");
  } catch (error) {
    if (error instanceof ActionAccessError) {
      return { error: error.message, success: null };
    }
    throw error;
  }

  const canReport = await assertCanSubmitReport(user.id);
  if (!canReport.ok) {
    return { error: canReport.error, success: null };
  }

  const duplicate = await checkDuplicateOpenReport(user.id, targetType, targetId);
  if (duplicate.isDuplicate) {
    return {
      error: null,
      success:
        duplicate.message ??
        "Bạn đã báo cáo nội dung này. ChapMee đang xem xét."
    };
  }

  const rateLimit = await enforceRateLimit("report", user.id, {
    count: REPORT_DAILY_LIMIT,
    windowMs: 24 * 60 * 60 * 1000
  });
  if (!rateLimit.allowed) {
    return {
      error: formatRateLimitMessage(rateLimit.resetAt),
      success: null
    };
  }

  const quality = await getReporterQuality(user.id);
  const basePriority = reasonCode === "copyright" ? "high" : "normal";
  const priority = computeReportPriority(basePriority, quality);

  const metadata: Record<string, string> = {};
  if (originalWorkUrl) metadata.original_work_url = originalWorkUrl;
  if (copyrightExplanation) metadata.copyright_explanation = copyrightExplanation;
  if (quality?.trustScore != null) {
    metadata.reporter_trust_score = String(quality.trustScore);
  }
  if (quality?.spamSuspected) {
    metadata.reporter_spam_suspected = "true";
  }

  const { data: report, error } = await db
    .from("reports")
    .insert({
      reporter_id: user.id,
      target_type: targetType,
      target_id: targetId,
      reason: reasonCode,
      reason_code: reasonCode,
      details: reasonDetail || null,
      reason_detail: reasonDetail || null,
      status: "pending",
      priority,
      metadata
    })
    .select("id")
    .single();

  if (error || !report) {
    return { error: error?.message ?? "Không gửi được báo cáo.", success: null };
  }

  if (targetType === "story_review") {
    const { incrementStoryReviewReportCount } = await import(
      "@/lib/reviews/story-reviews"
    );
    await incrementStoryReviewReportCount(targetId);
  }

  if (targetType === "inline_comment") {
    const { incrementInlineCommentReportCount } = await import(
      "@/lib/inline-comments/inline-comments"
    );
    await incrementInlineCommentReportCount(targetId);
  }

  await recordReportSubmitted(user.id);

  await trackServerEvent({
    eventName: analyticsEvents.reportCreated,
    metadata: {
      report_id: report.id,
      target_id: targetId,
      target_type: targetType,
      policy_area: reasonCodeToPolicyArea(reasonCode),
      priority
    },
    targetId,
    targetType: targetType as "story" | "chapter" | "comment" | "user"
  });

  const trackingItemType = mapReportTargetToTrackingItemType(targetType);
  await trackServerReport({
    userId: user.id,
    targetType,
    targetId,
    reasonCode,
    storyId: trackingItemType === "story" ? targetId : null,
    chapterId: trackingItemType === "chapter" ? targetId : null
  });

  try {
    const { syncTaxonomyReportToQualityFlag } = await import(
      "@/lib/content-taxonomy-quality/sync-report-flags"
    );
    await syncTaxonomyReportToQualityFlag(
      db,
      targetType,
      targetId,
      reasonCode,
      String(report.id)
    );
  } catch {
    // Non-blocking — report vẫn được tạo nếu bảng taxonomy quality chưa migrate
  }

  if (
    targetType === "story" &&
    (reasonCode === "wrong_taxonomy_tag" || reasonCode === "missing_content_warning")
  ) {
    try {
      const { trackTaxonomyReportServer } = await import(
        "@/lib/analytics/track-taxonomy-server"
      );
      await trackTaxonomyReportServer({
        storyId: targetId,
        reasonCode
      });
    } catch {
      // Non-blocking analytics
    }
  }

  return {
    error: null,
    success: "Đã gửi báo cáo. ChapMee sẽ xem xét trong thời gian sớm nhất."
  };
}
