"use server";

import { revalidatePath } from "next/cache";
import { appendNotificationCampaignAuditLog } from "@/lib/notification-campaigns/campaign-audit";
import {
  validateAllUsersConfirmPhrase,
  validateCampaignBody,
  validateCampaignName,
  validateScheduledAt
} from "@/lib/notification-campaigns/campaign-validation";
import { campaignTargetsAllUsers } from "@/lib/platform-content/parse-notification-campaign-filters";
import {
  normalizeCampaignInternalHref,
  validateCampaignInternalHref
} from "@/lib/platform-content/campaign-href";
import {
  createNotificationCampaign,
  createUserNotificationsForCampaign,
  deleteNotificationCampaign,
  duplicateNotificationCampaign,
  estimateNotificationRecipients,
  getNotificationCampaignById,
  sendNotificationCampaign,
  updateNotificationCampaign
} from "@/lib/platform-content/notification-campaigns";
import type {
  CampaignUserSearchResult,
  NotificationCampaignActionResult
} from "@/types/admin-notification-campaigns";
import type {
  CampaignActionType,
  CampaignNotificationType,
  CampaignPriority,
  CampaignStatus,
  CampaignTargetMode,
  CampaignVisualStyle
} from "@/types/platform-content";

const ADMIN_LIST_PATH = "/admin/notifications";

async function requireCampaignPermission(
  permission: "notification.campaign.create" | "notification.campaign.update" | "notification.campaign.view"
) {
  const { checkStaffPermission } = await import("@/lib/auth/staff-guards");
  return checkStaffPermission(permission);
}

function parseDateTime(raw: string | undefined) {
  if (!raw?.trim()) {
    return null;
  }

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function parseSegments(raw: string | string[] | undefined) {
  if (Array.isArray(raw)) {
    return raw.map(String).filter(Boolean);
  }
  if (!raw?.trim()) {
    return [];
  }
  return raw.split(",").map((item) => item.trim()).filter(Boolean);
}

function parseManualUserIds(raw: string | string[] | undefined) {
  if (Array.isArray(raw)) {
    return raw.map(String).filter(Boolean);
  }
  if (!raw?.trim()) {
    return [];
  }
  return raw.split(",").map((item) => item.trim()).filter(Boolean);
}

function revalidateCampaignPaths(id?: string) {
  revalidatePath(ADMIN_LIST_PATH);
  revalidatePath(`${ADMIN_LIST_PATH}/new`);
  if (id) {
    revalidatePath(`${ADMIN_LIST_PATH}/${id}`);
  }
  revalidatePath("/admin/content-hub/platform");
}

export type SaveNotificationCampaignInput = {
  id?: string;
  name?: string;
  title: string;
  message: string;
  notification_type?: string;
  priority?: string;
  visual_style?: string;
  action_type?: string;
  action_target_id?: string;
  href?: string;
  channel_in_app?: boolean;
  channel_email?: boolean;
  channel_banner?: boolean;
  channel_popup?: boolean;
  target_mode?: string;
  target_segments?: string | string[];
  manual_user_ids?: string | string[];
  status?: string;
  scheduled_at?: string;
  expires_at?: string;
  send_mode?: "draft" | "schedule" | "send_now" | "test";
};

export async function saveAdminNotificationCampaignAction(
  input: SaveNotificationCampaignInput
): Promise<NotificationCampaignActionResult> {
  const permission = input.id
    ? "notification.campaign.update"
    : "notification.campaign.create";
  const staff = await requireCampaignPermission(permission);

  if (!staff.ok) {
    return { ok: false, message: staff.error };
  }

  const name = (input.name ?? input.title).trim();
  const title = input.title.trim();
  const message = input.message.trim();

  const nameError = validateCampaignName(name);
  if (nameError) {
    return { ok: false, message: nameError };
  }

  if (!title) {
    return { ok: false, message: "Tiêu đề thông báo không được để trống." };
  }

  const bodyError = validateCampaignBody(message);
  if (bodyError) {
    return { ok: false, message: bodyError };
  }

  const hrefError = validateCampaignInternalHref(input.href);
  if (hrefError) {
    return { ok: false, message: hrefError };
  }

  const href = normalizeCampaignInternalHref(input.href);
  const targetMode = (input.target_mode as CampaignTargetMode) ?? "segment";
  const targetSegments = parseSegments(input.target_segments);
  const manualUserIds = parseManualUserIds(input.manual_user_ids);
  const channelInApp = input.channel_in_app ?? true;
  const channelEmail = input.channel_email ?? false;
  const channelBanner = input.channel_banner ?? false;
  const channelPopup = input.channel_popup ?? false;

  if (channelEmail) {
    return { ok: false, message: "Email chưa được cấu hình — tắt kênh email để tiếp tục." };
  }

  if (!channelInApp && !channelBanner && !channelPopup) {
    return { ok: false, message: "Chọn ít nhất một kênh (in-app, banner hoặc popup)." };
  }

  if (targetMode === "segment" && targetSegments.length === 0) {
    return { ok: false, message: "Chọn ít nhất một segment khi dùng chế độ segment." };
  }

  if (targetMode === "manual" && manualUserIds.length === 0) {
    return { ok: false, message: "Chọn ít nhất một người dùng khi dùng chế độ manual." };
  }

  const estimate = await estimateNotificationRecipients({
    target_mode: targetMode,
    target_segments: targetSegments,
    manual_user_ids: manualUserIds
  });

  if (estimate === 0 && input.send_mode !== "draft" && input.send_mode !== "test") {
    return { ok: false, message: "Không có người nhận dự kiến — kiểm tra lại đối tượng." };
  }

  const sendNow = input.send_mode === "send_now";
  const scheduleError = validateScheduledAt(input.scheduled_at, sendNow);
  if (scheduleError) {
    return { ok: false, message: scheduleError };
  }

  let status = (input.status as CampaignStatus) ?? "draft";
  if (input.send_mode === "schedule" && input.scheduled_at) {
    status = "scheduled";
  }

  const payload = {
    name,
    title,
    message,
    notification_type: (input.notification_type as CampaignNotificationType) ?? "system",
    priority: (input.priority as CampaignPriority) ?? "normal",
    visual_style: (input.visual_style as CampaignVisualStyle) ?? "default",
    action_type: (input.action_type as CampaignActionType) ?? "none",
    action_target_id: input.action_target_id?.trim() || null,
    href,
    channel_in_app: channelInApp,
    channel_email: false,
    channel_banner: channelBanner,
    channel_popup: channelPopup,
    target_mode: targetMode,
    target_segments: targetSegments,
    manual_user_ids: manualUserIds,
    status,
    scheduled_at: parseDateTime(input.scheduled_at),
    expires_at: parseDateTime(input.expires_at),
    estimated_recipient_count: estimate,
    updated_by: staff.userId
  };

  if (input.id) {
    const existing = await getNotificationCampaignById(input.id);
    if (!existing.item) {
      return { ok: false, message: "Không tìm thấy campaign." };
    }

    if (existing.item.status === "sent" || existing.item.status === "sending") {
      return { ok: false, message: "Campaign đã gửi hoặc đang gửi — không thể sửa." };
    }

    const result = await updateNotificationCampaign(input.id, payload, staff.userId);
    if (result.error || !result.item) {
      return { ok: false, message: result.error ?? "Không thể cập nhật campaign." };
    }

    revalidateCampaignPaths(result.item.id);
    return {
      ok: true,
      message: "Đã cập nhật campaign.",
      id: result.item.id
    };
  }

  const result = await createNotificationCampaign({
    ...payload,
    created_by: staff.userId
  });

  if (result.error || !result.item) {
    return { ok: false, message: result.error ?? "Không thể tạo campaign." };
  }

  revalidateCampaignPaths(result.item.id);
  return {
    ok: true,
    message: "Đã tạo campaign nháp.",
    id: result.item.id
  };
}

export type EstimateCampaignPreviewInput = {
  target_mode?: string;
  target_segments?: string | string[];
  manual_user_ids?: string | string[];
};

export async function estimateNotificationCampaignAction(
  input: EstimateCampaignPreviewInput
): Promise<{ count: number; error: string | null }> {
  const staff = await requireCampaignPermission("notification.campaign.update");
  if (!staff.ok) {
    return { count: 0, error: staff.error };
  }

  const count = await estimateNotificationRecipients({
    target_mode: (input.target_mode as CampaignTargetMode) ?? "segment",
    target_segments: parseSegments(input.target_segments),
    manual_user_ids: parseManualUserIds(input.manual_user_ids)
  });

  return { count, error: null };
}

export async function sendAdminNotificationCampaignAction(input: {
  campaignId: string;
  confirmAllUsers?: boolean;
  confirmPopup?: boolean;
  allUsersConfirmPhrase?: string;
}): Promise<NotificationCampaignActionResult> {
  const staff = await requireCampaignPermission("notification.campaign.update");
  if (!staff.ok) {
    return { ok: false, message: staff.error };
  }

  const { item: campaign, error: loadError } = await getNotificationCampaignById(input.campaignId);
  if (loadError || !campaign) {
    return { ok: false, message: loadError ?? "Không tìm thấy campaign." };
  }

  if (campaign.status === "sent") {
    return { ok: false, message: "Campaign đã được gửi." };
  }

  if (campaign.status === "sending") {
    return { ok: false, message: "Campaign đang được gửi." };
  }

  if (!campaign.channel_in_app) {
    return { ok: false, message: "Bật kênh in-app trước khi gửi." };
  }

  if (
    campaignTargetsAllUsers({
      target_mode: campaign.target_mode,
      target_segments: campaign.target_segments
    }) &&
    (!input.confirmAllUsers ||
      !validateAllUsersConfirmPhrase(input.allUsersConfirmPhrase ?? ""))
  ) {
    return {
      ok: false,
      message: "Cần xác nhận gửi toàn hệ thống bằng cách nhập GUI TAT CA."
    };
  }

  if (
    campaign.channel_popup &&
    campaign.notification_type !== "warning" &&
    !input.confirmPopup
  ) {
    return {
      ok: false,
      message:
        "Popup yêu cầu loại warning hoặc xác nhận bổ sung từ admin."
    };
  }

  const delivery = await sendNotificationCampaign(input.campaignId);

  if (delivery.error) {
    return { ok: false, message: delivery.error };
  }

  const { createClient } = await import("@/lib/data/server");
  const db = await createClient();
  await appendNotificationCampaignAuditLog(db, {
    campaignId: input.campaignId,
    actorId: staff.userId,
    action: "send_now",
    metadata: { created: delivery.created }
  });

  revalidateCampaignPaths(input.campaignId);
  return {
    ok: true,
    message: `Đã gửi ${delivery.created} thông báo in-app.`,
    id: input.campaignId
  };
}

export async function searchUsersForNotificationCampaignAction(
  query: string
): Promise<{ users: CampaignUserSearchResult[]; error: string | null }> {
  const staff = await requireCampaignPermission("notification.campaign.update");
  if (!staff.ok) {
    return { users: [], error: staff.error };
  }

  const trimmed = query.trim();
  if (!trimmed) {
    return { users: [], error: null };
  }

  const { createClient } = await import("@/lib/data/server");
  const db = await createClient();

  let builder = db
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .order("created_at", { ascending: false })
    .limit(10);

  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (uuidPattern.test(trimmed)) {
    builder = builder.eq("id", trimmed);
  } else if (trimmed.includes("@")) {
    const userId = await resolveUserIdByEmail(trimmed);
    if (!userId) {
      return { users: [], error: null };
    }
    builder = builder.eq("id", userId);
  } else {
    builder = builder.or(`username.ilike.%${trimmed}%,display_name.ilike.%${trimmed}%`);
  }

  const { data, error } = await builder;
  if (error) {
    return { users: [], error: error.message };
  }

  return {
    users: (data ?? []).map((row) => ({
      id: String(row.id),
      username: row.username ? String(row.username) : null,
      display_name: row.display_name ? String(row.display_name) : null,
      avatar_url: row.avatar_url ? String(row.avatar_url) : null
    })),
    error: null
  };
}

async function resolveUserIdByEmail(email: string) {
  try {
    const { createAdminClient } = await import("@/lib/data/admin");
    const admin = createAdminClient();
    const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    for (const user of data.users ?? []) {
      if (user.email?.toLowerCase() === email.toLowerCase()) {
        return user.id;
      }
    }
  } catch {
    /* optional */
  }
  return null;
}

export async function getNotificationCampaignPreviewAction(campaignId: string) {
  const staff = await requireCampaignPermission("notification.campaign.view");
  if (!staff.ok) {
    return { campaign: null, estimate: 0, error: staff.error };
  }

  const { item, error } = await getNotificationCampaignById(campaignId);
  if (error || !item) {
    return { campaign: null, estimate: 0, error: error ?? "Không tìm thấy campaign." };
  }

  const estimate = await estimateNotificationRecipients(item);
  return { campaign: item, estimate, error: null };
}

export async function testSendNotificationCampaignAction(input: {
  campaignId: string;
  userIds?: string[];
}): Promise<NotificationCampaignActionResult> {
  const staff = await requireCampaignPermission("notification.campaign.update");
  if (!staff.ok) {
    return { ok: false, message: staff.error };
  }

  const { item: campaign, error: loadError } = await getNotificationCampaignById(input.campaignId);
  if (loadError || !campaign) {
    return { ok: false, message: loadError ?? "Không tìm thấy campaign." };
  }

  const recipientIds =
    input.userIds && input.userIds.length > 0 ? input.userIds : [staff.userId];

  const delivery = await createUserNotificationsForCampaign(campaign, recipientIds);
  if (delivery.error) {
    return { ok: false, message: delivery.error };
  }

  const { createClient } = await import("@/lib/data/server");
  const db = await createClient();
  await appendNotificationCampaignAuditLog(db, {
    campaignId: input.campaignId,
    actorId: staff.userId,
    action: "test_send",
    metadata: { recipients: recipientIds, created: delivery.created }
  });

  return {
    ok: true,
    message: `Đã gửi test cho ${delivery.created} người nhận.`,
    id: input.campaignId
  };
}

export async function updateNotificationCampaignStatusAction(input: {
  id: string;
  status: CampaignStatus;
}): Promise<NotificationCampaignActionResult> {
  const staff = await requireCampaignPermission("notification.campaign.update");
  if (!staff.ok) {
    return { ok: false, message: staff.error };
  }

  const existing = await getNotificationCampaignById(input.id);
  if (!existing.item) {
    return { ok: false, message: "Không tìm thấy campaign." };
  }

  if (existing.item.status === "sent" && input.status !== "archived") {
    return { ok: false, message: "Campaign đã gửi — chỉ có thể lưu trữ hoặc xem." };
  }

  if (existing.item.status === "cancelled" && input.status === "scheduled") {
    return { ok: false, message: "Campaign đã hủy — không thể lên lịch lại." };
  }

  const result = await updateNotificationCampaign(
    input.id,
    {
      status: input.status,
      archived_at: input.status === "archived" ? new Date().toISOString() : null
    },
    staff.userId
  );

  if (result.error || !result.item) {
    return { ok: false, message: result.error ?? "Không thể cập nhật trạng thái." };
  }

  revalidateCampaignPaths(input.id);
  return { ok: true, message: "Đã cập nhật trạng thái campaign.", id: input.id };
}

export async function deleteNotificationCampaignAction(
  id: string
): Promise<NotificationCampaignActionResult> {
  const staff = await requireCampaignPermission("notification.campaign.update");
  if (!staff.ok) {
    return { ok: false, message: staff.error };
  }

  const existing = await getNotificationCampaignById(id);
  if (!existing.item) {
    return { ok: false, message: "Không tìm thấy campaign." };
  }

  if (existing.item.status !== "draft") {
    return { ok: false, message: "Chỉ xóa được campaign ở trạng thái nháp." };
  }

  const { createClient } = await import("@/lib/data/server");
  const db = await createClient();
  await appendNotificationCampaignAuditLog(db, {
    campaignId: id,
    actorId: staff.userId,
    action: "delete"
  });

  const result = await deleteNotificationCampaign(id);
  if (result.error) {
    return { ok: false, message: result.error };
  }

  revalidateCampaignPaths(id);
  return { ok: true, message: "Đã xóa campaign nháp." };
}

export async function duplicateNotificationCampaignAction(
  id: string
): Promise<NotificationCampaignActionResult> {
  const staff = await requireCampaignPermission("notification.campaign.create");
  if (!staff.ok) {
    return { ok: false, message: staff.error };
  }

  const result = await duplicateNotificationCampaign(id, staff.userId);
  if (result.error || !result.item) {
    return { ok: false, message: result.error ?? "Không thể nhân bản campaign." };
  }

  revalidateCampaignPaths(result.item.id);
  return {
    ok: true,
    message: "Đã nhân bản campaign.",
    id: result.item.id
  };
}

export async function bulkUpdateNotificationCampaignStatusAction(input: {
  ids: string[];
  status: CampaignStatus;
}): Promise<NotificationCampaignActionResult> {
  const staff = await requireCampaignPermission("notification.campaign.update");
  if (!staff.ok) {
    return { ok: false, message: staff.error };
  }

  let updated = 0;
  for (const id of input.ids) {
    const result = await updateNotificationCampaignStatusAction({ id, status: input.status });
    if (result.ok) updated += 1;
  }

  revalidateCampaignPaths();
  return {
    ok: true,
    message: `Đã cập nhật ${updated}/${input.ids.length} campaign.`
  };
}

export async function getNotificationCampaignAuditLogsAction(campaignId: string) {
  const staff = await requireCampaignPermission("notification.campaign.view");
  if (!staff.ok) {
    return { items: [], error: staff.error };
  }

  const { createClient } = await import("@/lib/data/server");
  const { listNotificationCampaignAuditLogs } = await import(
    "@/lib/notification-campaigns/campaign-audit"
  );
  const db = await createClient();
  return listNotificationCampaignAuditLogs(db, campaignId);
}
