"use server";

import { revalidatePath } from "next/cache";
import {
  findOrCreateModerationCase,
  linkReportsToCase
} from "@/lib/admin/create-or-update-moderation-case";
import { normalizeTargetType, severityToPriority } from "@/lib/admin/report-labels";
import { assertStaffPermission } from "@/lib/auth/staff-guards";
import { requireAdminOrModerator } from "@/lib/auth/requireAdminOrModerator";
import { logAdminAction } from "@/lib/audit/log-admin-action";
import { createNotification } from "@/lib/notifications/create-notification";
import { createClient } from "@/lib/supabase/server";
import type {
  ReportCaseActionKind,
  ReportResolutionCode,
  ReportSeverity
} from "@/types/reports";

type CaseInput = {
  targetType: string;
  targetId: string;
  note?: string;
  resolutionCode?: ReportResolutionCode | null;
  severity?: ReportSeverity;
};

async function requireModerator(canWrite = true) {
  const guard = await requireAdminOrModerator("/admin/reports");
  if (!guard.ok) return { ok: false as const, error: guard.error };
  if (canWrite) {
    await assertStaffPermission("report.review");
  }
  return { ok: true as const, profile: guard.profile };
}

async function getCaseReports(supabase: Awaited<ReturnType<typeof createClient>>, input: CaseInput) {
  const types = [input.targetType];
  if (input.targetType === "chapter") types.push("episode");

  const { data } = await supabase
    .from("reports")
    .select("id, reporter_id, status")
    .eq("target_id", input.targetId)
    .in("target_type", types);

  return data ?? [];
}

async function hideReportedContent(targetType: string, targetId: string) {
  const supabase = await createClient();
  const type = normalizeTargetType(targetType);

  if (type === "comment") {
    return supabase.from("comments").update({ status: "hidden" }).eq("id", targetId);
  }
  if (type === "community_post") {
    return supabase.from("community_posts").update({ status: "hidden" }).eq("id", targetId);
  }
  if (type === "story") {
    return supabase.from("stories").update({ status: "hidden" }).eq("id", targetId);
  }
  if (type === "chapter") {
    return supabase.from("episodes").update({ status: "hidden" }).eq("id", targetId);
  }
  return { error: null };
}

export async function reportCaseAction(
  input: CaseInput & { action: ReportCaseActionKind }
): Promise<{ ok: boolean; error?: string; message?: string }> {
  const mod = await requireModerator();
  if (!mod.ok) return { ok: false, error: mod.error };

  const note = String(input.note ?? "").trim();
  const needsNote =
    input.action === "hide_content" ||
    input.action === "warn_user" ||
    input.action === "escalate" ||
    input.action === "dismiss" ||
    input.action === "resolve";

  if (needsNote && note.length < 5) {
    return { ok: false, error: "Vui lòng nhập ghi chú tối thiểu 5 ký tự." };
  }

  if (input.action === "dismiss" && !input.resolutionCode) {
    return { ok: false, error: "Vui lòng chọn lý do từ chối báo cáo." };
  }

  const supabase = await createClient();
  const now = new Date().toISOString();
  const targetType = normalizeTargetType(input.targetType);
  const reports = await getCaseReports(supabase, { ...input, targetType });
  const reportIds = reports.map((r) => r.id as string);

  try {
    if (input.action === "assign") {
      await supabase
        .from("reports")
        .update({ status: "reviewing", assigned_to: mod.profile.id })
        .eq("target_id", input.targetId)
        .in("target_type", targetType === "chapter" ? ["chapter", "episode"] : [targetType])
        .in("status", ["pending", "open"]);

      const caseId = await findOrCreateModerationCase({
        targetType,
        targetId: input.targetId,
        reasonCode: null,
        incrementCount: false
      });

      if (caseId) {
        await supabase
          .from("moderation_cases")
          .update({
            status: "reviewing",
            assigned_to: mod.profile.id,
            updated_at: now
          })
          .eq("id", caseId);
        await linkReportsToCase(targetType, input.targetId, caseId);
      }

      await logAdminAction({
        actorId: mod.profile.id,
        action: "report_assigned",
        targetType,
        targetId: input.targetId,
        metadata: { report_ids: reportIds, note: note || null }
      });

      revalidatePaths();
      return { ok: true, message: "Đã nhận xử lý báo cáo." };
    }

    if (input.action === "dismiss") {
      await supabase
        .from("reports")
        .update({
          status: "rejected",
          resolution_code: input.resolutionCode,
          moderator_note: note,
          resolved_by: mod.profile.id,
          resolved_at: now
        })
        .eq("target_id", input.targetId)
        .in("target_type", targetType === "chapter" ? ["chapter", "episode"] : [targetType]);

      await supabase
        .from("moderation_cases")
        .update({
          status: "rejected",
          decision_code: input.resolutionCode,
          moderator_note: note,
          resolved_by: mod.profile.id,
          resolved_at: now
        })
        .eq("target_type", targetType)
        .eq("target_id", input.targetId)
        .in("status", ["open", "reviewing"]);

      await logAdminAction({
        actorId: mod.profile.id,
        action: "report_rejected",
        targetType,
        targetId: input.targetId,
        metadata: {
          resolution_code: input.resolutionCode,
          moderator_note: note,
          report_ids: reportIds
        }
      });

      revalidatePaths();
      return { ok: true, message: "Đã từ chối báo cáo." };
    }

    if (input.action === "hide_content") {
      const hideResult = await hideReportedContent(targetType, input.targetId);
      if (hideResult.error) {
        return { ok: false, error: hideResult.error.message };
      }

      await supabase
        .from("reports")
        .update({
          status: "resolved_action_taken",
          resolution_code: "content_hidden",
          moderator_note: note,
          resolved_by: mod.profile.id,
          resolved_at: now
        })
        .eq("target_id", input.targetId)
        .in("target_type", targetType === "chapter" ? ["chapter", "episode"] : [targetType]);

      await logAdminAction({
        actorId: mod.profile.id,
        action: "reported_content_hidden",
        targetType,
        targetId: input.targetId,
        metadata: { moderator_note: note, report_ids: reportIds }
      });

      revalidatePaths();
      return { ok: true, message: "Đã ẩn nội dung (không xóa vĩnh viễn)." };
    }

    if (input.action === "warn_user") {
      await logAdminAction({
        actorId: mod.profile.id,
        action: "reported_user_warned",
        targetType,
        targetId: input.targetId,
        metadata: { moderator_note: note, report_ids: reportIds }
      });

      await supabase
        .from("reports")
        .update({
          status: "resolved_action_taken",
          resolution_code: "warning_sent",
          moderator_note: note,
          resolved_by: mod.profile.id,
          resolved_at: now
        })
        .eq("target_id", input.targetId)
        .in("target_type", targetType === "chapter" ? ["chapter", "episode"] : [targetType]);

      revalidatePaths();
      return { ok: true, message: "Đã ghi nhận cảnh báo." };
    }

    if (input.action === "escalate") {
      await supabase
        .from("reports")
        .update({ status: "escalated", moderator_note: note })
        .eq("target_id", input.targetId)
        .in("target_type", targetType === "chapter" ? ["chapter", "episode"] : [targetType]);

      await logAdminAction({
        actorId: mod.profile.id,
        action: "report_escalated",
        targetType,
        targetId: input.targetId,
        metadata: { moderator_note: note, report_ids: reportIds }
      });

      revalidatePaths();
      return { ok: true, message: "Đã chuyển cấp xử lý." };
    }

    if (input.action === "quality_review" && targetType === "story") {
      const { applyAdminQualityAction } = await import("@/lib/admin/apply-quality-action");
      const res = await applyAdminQualityAction({
        storyId: input.targetId,
        action: "hide_temporarily",
        moderatorNote: note || "Chuyển từ báo cáo vi phạm",
        reasonCodes: ["moderator_confirmed_low_quality"]
      });
      if (!res.ok) {
        return { ok: false as const, error: ("error" in res ? res.error : null) ?? "Không gửi được." };
      }

      await supabase
        .from("reports")
        .update({
          status: "resolved_action_taken",
          resolution_code: "sent_to_quality_review",
          moderator_note: note,
          resolved_by: mod.profile.id,
          resolved_at: now
        })
        .eq("target_id", input.targetId)
        .eq("target_type", "story");

      revalidatePaths();
      return { ok: true, message: "Đã gửi sang chất lượng nội dung." };
    }

    // resolve default
    await supabase
      .from("reports")
      .update({
        status: "resolved",
        resolution_code: input.resolutionCode ?? "no_action_needed",
        moderator_note: note,
        resolved_by: mod.profile.id,
        resolved_at: now
      })
      .eq("target_id", input.targetId)
      .in("target_type", targetType === "chapter" ? ["chapter", "episode"] : [targetType]);

    await supabase
      .from("moderation_cases")
      .update({
        status: "resolved",
        decision_code: input.resolutionCode ?? "no_action_needed",
        moderator_note: note,
        resolved_by: mod.profile.id,
        resolved_at: now
      })
      .eq("target_type", targetType)
      .eq("target_id", input.targetId)
      .in("status", ["open", "reviewing"]);

    await logAdminAction({
      actorId: mod.profile.id,
      action: "report_resolved",
      targetType,
      targetId: input.targetId,
      metadata: {
        resolution_code: input.resolutionCode ?? "no_action_needed",
        moderator_note: note,
        report_ids: reportIds
      }
    });

    for (const row of reports) {
      if (row.reporter_id) {
        await createNotification(row.reporter_id as string, "community_guideline_update", {
          title: "Báo cáo đã được xử lý",
          body: "Báo cáo của bạn đã được moderator xem xét và xử lý.",
          actionUrl: "/",
          targetType: "profile",
          targetId: row.reporter_id as string,
          dedupeWindowMinutes: 60
        });
      }
    }

    revalidatePaths();
    return { ok: true, message: "Đã đánh dấu xử lý xong." };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Không thể xử lý báo cáo."
    };
  }
}

export async function updateReportCaseSeverityAction(input: {
  targetType: string;
  targetId: string;
  severity: ReportSeverity;
}) {
  const mod = await requireModerator();
  if (!mod.ok) return { ok: false, error: mod.error };

  const supabase = await createClient();
  const priority = severityToPriority(input.severity);
  const targetType = normalizeTargetType(input.targetType);

  await supabase
    .from("reports")
    .update({ priority })
    .eq("target_id", input.targetId)
    .in("target_type", targetType === "chapter" ? ["chapter", "episode"] : [targetType])
    .in("status", ["pending", "open", "reviewing"]);

  await logAdminAction({
    actorId: mod.profile.id,
    action: "report_severity_changed",
    targetType,
    targetId: input.targetId,
    metadata: { severity: input.severity, priority }
  });

  revalidatePath("/admin/reports");
  return { ok: true, message: "Đã cập nhật mức độ ưu tiên." };
}

function revalidatePaths() {
  revalidatePath("/admin/reports");
  revalidatePath("/admin/moderation");
  revalidatePath("/admin");
}
