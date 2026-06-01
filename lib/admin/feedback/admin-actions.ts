"use server";

import { revalidatePath } from "next/cache";
import { canTransitionFeedbackStatus } from "@/lib/admin/feedback/status-transitions";
import type {
  FeedbackPriority,
  FeedbackStatus,
  FeedbackType
} from "@/types/contact-settings";

export type FeedbackActionResult = { ok: boolean; message: string | null };

async function requireFeedbackUpdate() {
  const { checkStaffPermission } = await import("@/lib/auth/staff-guards");
  return checkStaffPermission("feedback.update.status");
}

async function insertFeedbackEvent(input: {
  feedbackId: string;
  adminId: string;
  eventType: string;
  oldStatus?: FeedbackStatus | null;
  newStatus?: FeedbackStatus | null;
  oldValue?: string | null;
  newValue?: string | null;
  note?: string | null;
}) {
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  await supabase.from("feedback_events").insert({
    feedback_id: input.feedbackId,
    admin_id: input.adminId,
    event_type: input.eventType,
    old_status: input.oldStatus ?? null,
    new_status: input.newStatus ?? null,
    old_value: input.oldValue ?? null,
    new_value: input.newValue ?? null,
    note: input.note?.slice(0, 2000) ?? null
  });
}

async function logFeedbackAudit(
  adminId: string,
  action: string,
  feedbackId: string,
  metadata?: Record<string, unknown>
) {
  try {
    const { createAdminAuditLog } = await import("@/lib/admin/create-audit-log");
    await createAdminAuditLog({
      action,
      targetType: "feedback",
      targetId: feedbackId,
      metadata: { actor_user_id: adminId, ...metadata }
    });
  } catch {
    /* audit optional */
  }
}

async function loadFeedback(feedbackId: string) {
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("feedback_messages")
    .select("*")
    .eq("id", feedbackId)
    .maybeSingle();
  if (error || !data) return null;
  return data;
}

export async function updateFeedbackStatusAction(
  _prev: FeedbackActionResult,
  formData: FormData
): Promise<FeedbackActionResult> {
  const auth = await requireFeedbackUpdate();
  if (!auth.ok) return { ok: false, message: auth.error };

  const feedbackId = String(formData.get("feedbackId") ?? "").trim();
  const newStatus = String(formData.get("status") ?? "").trim() as FeedbackStatus;
  const note = String(formData.get("note") ?? "").trim() || null;

  const existing = await loadFeedback(feedbackId);
  if (!existing) return { ok: false, message: "Không tìm thấy feedback." };

  const oldStatus = existing.status as FeedbackStatus;
  const { getCurrentAuthContext } = await import("@/lib/auth/permissions");
  const ctx = await getCurrentAuthContext();
  const isSuper =
    ctx?.roles.includes("super_admin") || ctx?.roles.includes("owner");

  if (!canTransitionFeedbackStatus(oldStatus, newStatus, isSuper)) {
    return { ok: false, message: "Không thể chuyển sang trạng thái này." };
  }

  const now = new Date().toISOString();
  const payload: Record<string, unknown> = { status: newStatus };
  if (newStatus === "resolved") payload.resolved_at = now;
  if (newStatus === "closed") payload.closed_at = now;

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { error } = await supabase.from("feedback_messages").update(payload).eq("id", feedbackId);
  if (error) return { ok: false, message: "Không thể cập nhật trạng thái." };

  await insertFeedbackEvent({
    feedbackId,
    adminId: auth.userId!,
    eventType: "status_change",
    oldStatus,
    newStatus,
    note
  });
  await logFeedbackAudit(auth.userId!, "feedback.status_update", feedbackId, {
    old_status: oldStatus,
    new_status: newStatus
  });

  if (formData.get("notifyUser") === "true" && existing.user_id) {
    const { createNotification } = await import("@/lib/notifications/create-notification");
    await createNotification(String(existing.user_id), "feedback_status_updated", {
      title: "Cập nhật góp ý",
      body: "ChapMee đã cập nhật trạng thái góp ý của bạn.",
      targetType: "feedback",
      targetId: feedbackId,
      actionUrl: "/me"
    });
  }

  revalidatePath("/admin/feedback");
  return { ok: true, message: "Đã cập nhật trạng thái." };
}

export async function saveFeedbackInternalNoteAction(
  feedbackId: string,
  internalNote: string
): Promise<FeedbackActionResult> {
  const auth = await requireFeedbackUpdate();
  if (!auth.ok) return { ok: false, message: auth.error };

  const existing = await loadFeedback(feedbackId);
  if (!existing) return { ok: false, message: "Không tìm thấy feedback." };

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { error } = await supabase
    .from("feedback_messages")
    .update({ internal_note: internalNote.slice(0, 4000) })
    .eq("id", feedbackId);

  if (error) return { ok: false, message: "Không thể lưu ghi chú." };

  await insertFeedbackEvent({
    feedbackId,
    adminId: auth.userId!,
    eventType: "internal_note",
    note: internalNote.slice(0, 500)
  });

  revalidatePath("/admin/feedback");
  return { ok: true, message: "Đã lưu ghi chú nội bộ." };
}

export async function sendFeedbackReplyAction(
  feedbackId: string,
  reply: string
): Promise<FeedbackActionResult> {
  const { checkStaffAnyPermission } = await import("@/lib/auth/staff-guards");
  const auth = await checkStaffAnyPermission(["feedback.reply", "feedback.update.status"]);
  if (!auth.ok) return { ok: false, message: auth.error };

  if (!reply.trim()) return { ok: false, message: "Nội dung phản hồi không được trống." };

  const existing = await loadFeedback(feedbackId);
  if (!existing) return { ok: false, message: "Không tìm thấy feedback." };

  const oldStatus = existing.status as FeedbackStatus;
  const newStatus: FeedbackStatus =
    oldStatus === "new" || oldStatus === "reviewing" || oldStatus === "need_more_info"
      ? "replied"
      : oldStatus;

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { error } = await supabase
    .from("feedback_messages")
    .update({
      admin_reply: reply.slice(0, 4000),
      status: newStatus
    })
    .eq("id", feedbackId);

  if (error) return { ok: false, message: "Không thể gửi phản hồi." };

  await insertFeedbackEvent({
    feedbackId,
    adminId: auth.userId!,
    eventType: "admin_reply",
    oldStatus,
    newStatus: newStatus !== oldStatus ? newStatus : null,
    note: reply.slice(0, 500)
  });
  await logFeedbackAudit(auth.userId!, "feedback.reply", feedbackId);

  if (existing.user_id) {
    const { createNotification } = await import("@/lib/notifications/create-notification");
    await createNotification(String(existing.user_id), "feedback_status_updated", {
      title: "Phản hồi góp ý",
      body: reply.slice(0, 200),
      targetType: "feedback",
      targetId: feedbackId,
      actionUrl: "/me"
    });
  }

  revalidatePath("/admin/feedback");
  return { ok: true, message: "Đã gửi phản hồi cho người dùng." };
}

export async function assignFeedbackAction(
  feedbackId: string,
  adminId: string | null
): Promise<FeedbackActionResult> {
  const { checkStaffAnyPermission } = await import("@/lib/auth/staff-guards");
  const auth = await checkStaffAnyPermission(["feedback.assign", "feedback.update.status"]);
  if (!auth.ok) return { ok: false, message: auth.error };

  const existing = await loadFeedback(feedbackId);
  if (!existing) return { ok: false, message: "Không tìm thấy feedback." };

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { error } = await supabase
    .from("feedback_messages")
    .update({ assigned_admin_id: adminId })
    .eq("id", feedbackId);

  if (error) return { ok: false, message: "Không thể gán người xử lý." };

  await insertFeedbackEvent({
    feedbackId,
    adminId: auth.userId!,
    eventType: "assign",
    oldValue: existing.assigned_admin_id ? String(existing.assigned_admin_id) : null,
    newValue: adminId,
    note: adminId ? "Gán người xử lý" : "Bỏ gán"
  });

  revalidatePath("/admin/feedback");
  return { ok: true, message: adminId ? "Đã gán cho bạn." : "Đã bỏ gán." };
}

export async function assignFeedbackToMeAction(feedbackId: string) {
  const { checkStaffAnyPermission } = await import("@/lib/auth/staff-guards");
  const auth = await checkStaffAnyPermission(["feedback.assign", "feedback.update.status"]);
  if (!auth.ok) return { ok: false, message: auth.error };
  return assignFeedbackAction(feedbackId, auth.userId!);
}

export async function updateFeedbackPriorityAction(
  feedbackId: string,
  priority: FeedbackPriority
): Promise<FeedbackActionResult> {
  const auth = await requireFeedbackUpdate();
  if (!auth.ok) return { ok: false, message: auth.error };

  const existing = await loadFeedback(feedbackId);
  if (!existing) return { ok: false, message: "Không tìm thấy feedback." };

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { error } = await supabase
    .from("feedback_messages")
    .update({ priority })
    .eq("id", feedbackId);

  if (error) return { ok: false, message: "Không thể đổi mức ưu tiên." };

  await insertFeedbackEvent({
    feedbackId,
    adminId: auth.userId!,
    eventType: "priority_change",
    oldValue: String(existing.priority ?? "normal"),
    newValue: priority
  });

  revalidatePath("/admin/feedback");
  return { ok: true, message: "Đã cập nhật mức ưu tiên." };
}

export async function updateFeedbackCategoryAction(
  feedbackId: string,
  category: FeedbackType
): Promise<FeedbackActionResult> {
  const auth = await requireFeedbackUpdate();
  if (!auth.ok) return { ok: false, message: auth.error };

  const existing = await loadFeedback(feedbackId);
  if (!existing) return { ok: false, message: "Không tìm thấy feedback." };

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { error } = await supabase.from("feedback_messages").update({ category }).eq("id", feedbackId);
  if (error) return { ok: false, message: "Không thể đổi loại feedback." };

  await insertFeedbackEvent({
    feedbackId,
    adminId: auth.userId!,
    eventType: "category_change",
    oldValue: String(existing.category),
    newValue: category
  });

  revalidatePath("/admin/feedback");
  return { ok: true, message: "Đã cập nhật loại feedback." };
}

export async function quickFeedbackStatusAction(
  feedbackId: string,
  status: FeedbackStatus,
  note?: string
): Promise<FeedbackActionResult> {
  const fd = new FormData();
  fd.set("feedbackId", feedbackId);
  fd.set("status", status);
  if (note) fd.set("note", note);
  return updateFeedbackStatusAction({ ok: false, message: null }, fd);
}

export async function markFeedbackDuplicateAction(feedbackId: string) {
  return quickFeedbackStatusAction(feedbackId, "rejected", "Đánh dấu trùng lặp");
}

export async function markFeedbackSpamAction(feedbackId: string) {
  return quickFeedbackStatusAction(feedbackId, "rejected", "Đánh dấu spam");
}

export async function loadAdminFeedbackDetailAction(feedbackId: string) {
  const { getAdminFeedbackDetail } = await import("@/lib/admin/get-feedback-list");
  return getAdminFeedbackDetail(feedbackId);
}

export async function exportFeedbackCsvAction(
  filters: import("@/types/admin-feedback").FeedbackDashboardFilters
) {
  const { checkStaffPermission } = await import("@/lib/auth/staff-guards");
  const auth = await checkStaffPermission("feedback.export");
  if (!auth.ok) {
    return { csv: null, error: auth.error ?? "Không có quyền xuất CSV." };
  }

  const { listAdminFeedback } = await import("@/lib/admin/get-feedback-list");
  const result = await listAdminFeedback({ ...filters, page: 1, pageSize: 5000 });
  if (result.error) return { csv: null, error: result.error };

  const header = [
    "code",
    "type",
    "priority",
    "status",
    "user",
    "contact_email",
    "title",
    "message",
    "related_entity_type",
    "related_entity_id",
    "assigned_to",
    "created_at",
    "resolved_at",
    "closed_at"
  ].join(",");

  const lines = result.items.map((r) =>
    [
      r.code ?? r.id,
      r.category,
      r.priority ?? "normal",
      r.status,
      r.user_username ?? r.user_id ?? "",
      r.contact_email ?? "",
      `"${(r.title ?? "").replace(/"/g, '""')}"`,
      `"${r.message.replace(/"/g, '""')}"`,
      r.related_entity_type ?? "",
      r.related_entity_id ?? "",
      r.assigned_admin_id ?? "",
      r.created_at,
      r.resolved_at ?? "",
      r.closed_at ?? ""
    ].join(",")
  );

  await logFeedbackAudit(auth.userId!, "feedback.export", "export", {
    row_count: result.items.length
  });

  return { csv: [header, ...lines].join("\n"), error: null };
}
