"use server";

import { createClient } from "@/lib/supabase/server";
import { formatFeedbackCode } from "@/lib/feedback/constants";
import type { FeedbackDashboardFilters } from "@/types/admin-feedback";
import type {
  AdminFeedbackDetail,
  AdminFeedbackListItem,
  FeedbackAttachmentRow,
  FeedbackEventRow,
  FeedbackPriority
} from "@/types/contact-settings";

async function countUserFeedback24h(userId: string | null): Promise<number> {
  if (!userId) return 0;
  const supabase = await createClient();
  const since = new Date(Date.now() - 86400000).toISOString();
  const { count } = await supabase
    .from("feedback_messages")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since);
  return count ?? 0;
}

function mapFeedbackRow(
  row: Record<string, unknown>,
  profile?: {
    display_name: string | null;
    username: string | null;
    avatar_url?: string | null;
  } | null,
  assignee?: { display_name: string | null; username: string | null } | null,
  attachmentCount = 0,
  userFeedback24h = 0
): AdminFeedbackListItem & {
  assigned_admin_label: string | null;
  attachment_count: number;
  user_feedback_count_24h: number;
} {
  const id = String(row.id);
  return {
    id,
    code: row.code ? String(row.code) : formatFeedbackCode(null, id),
    user_id: row.user_id ? String(row.user_id) : null,
    category: row.category as AdminFeedbackListItem["category"],
    title: row.title ? String(row.title) : null,
    message: String(row.message),
    contact_email: row.contact_email ? String(row.contact_email) : null,
    related_url: row.related_url ? String(row.related_url) : null,
    screenshot_url: row.screenshot_url ? String(row.screenshot_url) : null,
    status: (row.status as AdminFeedbackListItem["status"]) ?? "new",
    priority: (row.priority as FeedbackPriority) ?? "normal",
    internal_note: row.internal_note ? String(row.internal_note) : null,
    admin_reply: row.admin_reply ? String(row.admin_reply) : null,
    assigned_admin_id: row.assigned_admin_id ? String(row.assigned_admin_id) : null,
    source: row.source ? String(row.source) : "app",
    related_entity_type: row.related_entity_type ? String(row.related_entity_type) : null,
    related_entity_id: row.related_entity_id ? String(row.related_entity_id) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at ?? row.created_at),
    resolved_at: row.resolved_at ? String(row.resolved_at) : null,
    closed_at: row.closed_at ? String(row.closed_at) : null,
    user_agent: row.user_agent ? String(row.user_agent) : null,
    device_info:
      row.device_info && typeof row.device_info === "object"
        ? (row.device_info as Record<string, unknown>)
        : null,
    user_display_name: profile?.display_name ?? null,
    user_username: profile?.username ?? null,
    assigned_admin_label:
      assignee?.display_name?.trim() || assignee?.username?.trim() || null,
    attachment_count: attachmentCount,
    user_feedback_count_24h: userFeedback24h
  };
}

export async function listAdminFeedback(filters: FeedbackDashboardFilters = getDefault()) {
  const { checkStaffPermission } = await import("@/lib/auth/staff-guards");
  const { getCurrentAuthContext } = await import("@/lib/auth/permissions");
  const auth = await checkStaffPermission("feedback.view.all");
  if (!auth.ok) {
    return { items: [] as AdminFeedbackListItem[], total: 0, error: auth.error };
  }

  const ctx = await getCurrentAuthContext();
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, filters.pageSize ?? 20));
  const fromIdx = (page - 1) * pageSize;
  const toIdx = fromIdx + pageSize - 1;

  const supabase = await createClient();
  let query = supabase
    .from("feedback_messages")
    .select(
      `
      *,
      profiles:user_id (display_name, username, avatar_url),
      assignee:assigned_admin_id (display_name, username)
    `,
      { count: "exact" }
    )
    .order("created_at", { ascending: false });

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }
  if (filters.category && filters.category !== "all") {
    query = query.eq("category", filters.category);
  }
  if (filters.priority && filters.priority !== "all") {
    query = query.eq("priority", filters.priority);
  }
  if (filters.from) query = query.gte("created_at", filters.from);
  if (filters.to) query = query.lte("created_at", filters.to);
  if (filters.userId) query = query.eq("user_id", filters.userId);

  if (filters.hasScreenshot === "yes") {
    query = query.not("screenshot_url", "is", null);
  } else if (filters.hasScreenshot === "no") {
    query = query.is("screenshot_url", null);
  }

  if (filters.assignee === "me" && ctx?.userId) {
    query = query.eq("assigned_admin_id", ctx.userId);
  } else if (filters.assignee === "unassigned") {
    query = query.is("assigned_admin_id", null);
  }

  const { data, error, count } = await query.range(fromIdx, toIdx);

  if (error) {
    return { items: [], total: 0, error: "Không thể tải danh sách feedback." };
  }

  let items = await Promise.all(
    (data ?? []).map(async (row) => {
      const profile = row.profiles as {
        display_name: string | null;
        username: string | null;
        avatar_url?: string | null;
      } | null;
      const assignee = row.assignee as {
        display_name: string | null;
        username: string | null;
      } | null;
      const { count: attCount } = await supabase
        .from("feedback_attachments")
        .select("id", { count: "exact", head: true })
        .eq("feedback_id", row.id as string);
      const userId = row.user_id ? String(row.user_id) : null;
      const fb24 = await countUserFeedback24h(userId);
      return mapFeedbackRow(
        row as Record<string, unknown>,
        profile,
        assignee,
        (attCount ?? 0) + (row.screenshot_url ? 1 : 0),
        fb24
      );
    })
  );

  if (filters.search.trim()) {
    const q = filters.search.trim().toLowerCase();
    items = items.filter((item) => {
      const haystack = [
        item.code,
        item.title,
        item.message,
        item.contact_email,
        item.user_display_name,
        item.user_username,
        item.user_id,
        item.id
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }

  return { items, total: count ?? items.length, error: null };
}

function getDefault(): FeedbackDashboardFilters {
  return {
    search: "",
    status: "all",
    category: "all",
    priority: "all",
    hasScreenshot: "all",
    assignee: "all",
    page: 1,
    pageSize: 20
  };
}

export async function getRecentFeedback(limit = 8) {
  const result = await listAdminFeedback({ ...getDefault(), pageSize: limit });
  return result.items;
}

export async function getAdminFeedbackDetail(
  feedbackId: string
): Promise<{ detail: AdminFeedbackDetail | null; error: string | null }> {
  const { checkStaffPermission } = await import("@/lib/auth/staff-guards");
  const auth = await checkStaffPermission("feedback.view.all");
  if (!auth.ok) {
    return { detail: null, error: auth.error };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("feedback_messages")
    .select(
      `
      *,
      profiles:user_id (display_name, username, avatar_url),
      assignee:assigned_admin_id (display_name, username)
    `
    )
    .eq("id", feedbackId)
    .maybeSingle();

  if (error || !data) {
    return { detail: null, error: "Không tìm thấy feedback." };
  }

  const [{ data: events }, { data: attachments }] = await Promise.all([
    supabase
      .from("feedback_events")
      .select("*")
      .eq("feedback_id", feedbackId)
      .order("created_at", { ascending: false }),
    supabase.from("feedback_attachments").select("*").eq("feedback_id", feedbackId)
  ]);

  const adminIds = Array.from(
    new Set((events ?? []).map((e) => e.admin_id).filter(Boolean) as string[])
  );
  const adminLabels = new Map<string, string>();
  if (adminIds.length) {
    const { data: admins } = await supabase
      .from("profiles")
      .select("id, display_name, username")
      .in("id", adminIds);
    for (const a of admins ?? []) {
      adminLabels.set(
        a.id as string,
        (a.display_name as string)?.trim() || (a.username as string)?.trim() || "Admin"
      );
    }
  }

  const profile = data.profiles as {
    display_name: string | null;
    username: string | null;
    avatar_url?: string | null;
  } | null;
  const assignee = data.assignee as {
    display_name: string | null;
    username: string | null;
  } | null;
  const userId = data.user_id ? String(data.user_id) : null;
  const fb24 = await countUserFeedback24h(userId);

  const mappedEvents: FeedbackEventRow[] = (events ?? []).map((e) => ({
    id: String(e.id),
    feedback_id: String(e.feedback_id),
    admin_id: e.admin_id ? String(e.admin_id) : null,
    event_type: String(e.event_type),
    old_status: e.old_status as FeedbackEventRow["old_status"],
    new_status: e.new_status as FeedbackEventRow["new_status"],
    old_value: e.old_value ? String(e.old_value) : null,
    new_value: e.new_value ? String(e.new_value) : null,
    note: e.note ? String(e.note) : null,
    created_at: String(e.created_at),
    admin_label: e.admin_id ? adminLabels.get(String(e.admin_id)) ?? null : null
  }));

  const attRows: FeedbackAttachmentRow[] = (attachments ?? []).map((a) => ({
    id: String(a.id),
    feedback_id: String(a.feedback_id),
    file_url: String(a.file_url),
    file_type: a.file_type ? String(a.file_type) : null,
    file_size: a.file_size != null ? Number(a.file_size) : null,
    created_at: String(a.created_at)
  }));

  const base = mapFeedbackRow(
    data as Record<string, unknown>,
    profile,
    assignee,
    attRows.length + (data.screenshot_url ? 1 : 0),
    fb24
  );

  return {
    detail: {
      ...base,
      events: mappedEvents,
      attachments: attRows,
      user_avatar_url: profile?.avatar_url ?? null
    } as AdminFeedbackDetail & {
      attachments: FeedbackAttachmentRow[];
      user_avatar_url: string | null;
    },
    error: null
  };
}
