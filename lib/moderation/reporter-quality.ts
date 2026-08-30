import { createClient } from "@/lib/data/server";
import { hasActiveRestriction } from "@/lib/moderation/check-restriction";
import { isMissingSchemaError } from "@/lib/data/schema-errors";
import type { ReportPriority, ReporterQualitySummary } from "@/types/moderation";

export type { ReporterQualitySummary };

const OPEN_STATUSES = ["pending", "open", "reviewing"];

export const REPORT_DAILY_LIMIT = 10;

export async function assertCanSubmitReport(userId: string): Promise<
  | { ok: true }
  | { ok: false; error: string; isDuplicate?: boolean }
> {
  const blocked = await hasActiveRestriction(userId, "report_block");
  if (blocked) {
    return {
      ok: false,
      error:
        "Bạn đang bị hạn chế gửi báo cáo. Xem trạng thái tài khoản tại /me/account-status."
    };
  }

  return { ok: true };
}

export async function checkDuplicateOpenReport(
  userId: string,
  targetType: string,
  targetId: string
): Promise<{ isDuplicate: boolean; message?: string }> {
  const db = await createClient();
  const { data, error } = await db
    .from("reports")
    .select("id, status")
    .eq("reporter_id", userId)
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .in("status", OPEN_STATUSES)
    .limit(1);

  if (error) {
    if (isMissingSchemaError(error)) {
      return { isDuplicate: false };
    }
    return { isDuplicate: false };
  }

  if ((data ?? []).length > 0) {
    return {
      isDuplicate: true,
      message:
        "Bạn đã báo cáo nội dung này. ChapMee đang xem xét."
    };
  }

  const { count } = await db
    .from("reports")
    .select("id", { count: "exact", head: true })
    .eq("reporter_id", userId)
    .eq("target_type", targetType)
    .eq("target_id", targetId);

  if ((count ?? 0) >= 2) {
    return {
      isDuplicate: true,
      message:
        "Bạn đã báo cáo nội dung này trước đó. Vui lòng chờ kết quả xử lý."
    };
  }

  return { isDuplicate: false };
}

export async function recordReportSubmitted(userId: string) {
  const db = await createClient();
  const { error } = await db.rpc("increment_reporter_submitted", {
    p_user_id: userId
  });
  if (error && !isMissingSchemaError(error)) {
    console.warn("[reporter-quality] increment failed", error.message);
  }
}

export type ReportOutcome = "valid" | "no_violation" | "abuse";

export async function recordReportOutcome(
  reporterId: string,
  outcome: ReportOutcome
) {
  if (!reporterId) {
    return;
  }
  const db = await createClient();
  const { error } = await db.rpc("apply_reporter_outcome", {
    p_reporter_id: reporterId,
    p_outcome: outcome
  });
  if (error && !isMissingSchemaError(error)) {
    console.warn("[reporter-quality] outcome failed", error.message);
  }
}

export async function getReporterQuality(
  userId: string
): Promise<ReporterQualitySummary | null> {
  const db = await createClient();
  const { data, error } = await db
    .from("reporter_quality")
    .select(
      `
      user_id,
      trust_score,
      reports_submitted,
      reports_valid,
      reports_rejected,
      reports_abuse,
      spam_suspected,
      profiles:user_id ( display_name, username )
    `
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    if (isMissingSchemaError(error)) {
      return null;
    }
    return null;
  }

  const profile = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles;
  const submitted = data.reports_submitted ?? 0;
  const valid = data.reports_valid ?? 0;
  const rejected = (data.reports_rejected ?? 0) + (data.reports_abuse ?? 0);

  return {
    userId: data.user_id,
    trustScore: data.trust_score ?? 50,
    reportsSubmitted: submitted,
    reportsValid: valid,
    reportsRejected: data.reports_rejected ?? 0,
    reportsAbuse: data.reports_abuse ?? 0,
    spamSuspected: data.spam_suspected ?? false,
    accuracyPercent:
      submitted > 0 ? Math.round((valid / submitted) * 100) : null,
    displayName: profile?.display_name ?? profile?.username ?? null,
    username: profile?.username?.trim().toLowerCase() ?? null
  };
}

export function computeReportPriority(
  basePriority: ReportPriority,
  quality: ReporterQualitySummary | null
): ReportPriority {
  if (!quality) {
    return basePriority;
  }
  if (basePriority === "urgent" || basePriority === "high") {
    if (quality.spamSuspected || quality.trustScore < 25) {
      return "normal";
    }
    return basePriority;
  }
  if (quality.spamSuspected || quality.trustScore < 30) {
    return "low";
  }
  if (quality.trustScore < 55) {
    return "low";
  }
  if (quality.trustScore >= 75 && basePriority === "normal") {
    return "normal";
  }
  return basePriority;
}

export function formatRateLimitMessage(resetAt: string) {
  const reset = new Date(resetAt);
  const formatted = new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit"
  }).format(reset);
  return `Bạn đã gửi tối đa ${REPORT_DAILY_LIMIT} báo cáo trong 24 giờ. Vui lòng thử lại sau ${formatted}.`;
}
