import { appendNotificationCampaignAuditLog } from "@/lib/notification-campaigns/campaign-audit";
import {
  buildCampaignInsertPayload,
  buildCampaignUpdatePayload,
  hasExtendedNotificationCampaignSchema
} from "@/lib/notification-campaigns/schema-capabilities";
import { createClient } from "@/lib/supabase/server";
import { sanitizeUserNotificationHref } from "@/lib/platform-content/campaign-href";
import {
  estimateCampaignRecipientCount,
  resolveCampaignRecipientUserIds
} from "@/lib/platform-content/campaign-segments";
import type { NotificationCampaignListFilters } from "@/types/admin-notification-campaigns";
import type { NotificationCampaignStats } from "@/types/admin-notification-campaigns";
import type {
  CampaignStatus,
  CreateNotificationCampaignInput,
  ListNotificationCampaignsOptions,
  NotificationCampaign,
  NotificationCampaignDeliveryStats,
  UpdateNotificationCampaignInput,
  UserNotification
} from "@/types/platform-content";

function mapCampaign(row: Record<string, unknown>): NotificationCampaign {
  return {
    id: String(row.id),
    name: row.name ? String(row.name) : null,
    title: String(row.title),
    message: String(row.message),
    notification_type: row.notification_type as NotificationCampaign["notification_type"],
    priority: (row.priority as NotificationCampaign["priority"]) ?? "normal",
    visual_style: (row.visual_style as NotificationCampaign["visual_style"]) ?? "default",
    action_type: (row.action_type as NotificationCampaign["action_type"]) ?? "none",
    action_target_id: row.action_target_id ? String(row.action_target_id) : null,
    href: row.href ? String(row.href) : null,
    channel_in_app: Boolean(row.channel_in_app),
    channel_email: Boolean(row.channel_email),
    channel_banner: Boolean(row.channel_banner),
    channel_popup: Boolean(row.channel_popup),
    target_mode: row.target_mode as NotificationCampaign["target_mode"],
    target_segments: Array.isArray(row.target_segments)
      ? row.target_segments.map(String)
      : [],
    manual_user_ids: Array.isArray(row.manual_user_ids)
      ? row.manual_user_ids.map(String)
      : [],
    status: row.status as NotificationCampaign["status"],
    scheduled_at: row.scheduled_at ? String(row.scheduled_at) : null,
    expires_at: row.expires_at ? String(row.expires_at) : null,
    sent_at: row.sent_at ? String(row.sent_at) : null,
    estimated_recipient_count: Number(row.estimated_recipient_count ?? 0),
    created_by: row.created_by ? String(row.created_by) : null,
    updated_by: row.updated_by ? String(row.updated_by) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    archived_at: row.archived_at ? String(row.archived_at) : null
  };
}

function mapUserNotification(row: Record<string, unknown>): UserNotification {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    campaign_id: row.campaign_id ? String(row.campaign_id) : null,
    title: String(row.title),
    message: String(row.message),
    notification_type: row.notification_type as UserNotification["notification_type"],
    href: sanitizeUserNotificationHref(row.href ? String(row.href) : null),
    is_read: Boolean(row.is_read),
    read_at: row.read_at ? String(row.read_at) : null,
    created_at: String(row.created_at)
  };
}

type ListInput = ListNotificationCampaignsOptions | NotificationCampaignListFilters;

function applyAdminListFilters(query: any, options: NotificationCampaignListFilters) {
  let builder = query;

  if (options.status !== "all") {
    builder = builder.eq("status", options.status);
  }

  if (options.notificationType !== "all") {
    builder = builder.eq("notification_type", options.notificationType);
  }

  if (options.channel === "in_app") {
    builder = builder.eq("channel_in_app", true);
  } else if (options.channel === "email") {
    builder = builder.eq("channel_email", true);
  }

  if (options.segment !== "all") {
    builder = builder.contains("target_segments", [options.segment]);
  }

  if (options.search?.trim()) {
    const term = options.search.trim();
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (uuidPattern.test(term)) {
      builder = builder.eq("id", term);
    } else {
      builder = builder.or(`title.ilike.%${term}%,message.ilike.%${term}%`);
    }
  }

  if (options.createdFrom) {
    builder = builder.gte("created_at", new Date(options.createdFrom).toISOString());
  }
  if (options.createdTo) {
    const end = new Date(options.createdTo);
    end.setHours(23, 59, 59, 999);
    builder = builder.lte("created_at", end.toISOString());
  }
  if (options.sentFrom) {
    builder = builder.gte("sent_at", new Date(options.sentFrom).toISOString());
  }
  if (options.sentTo) {
    const end = new Date(options.sentTo);
    end.setHours(23, 59, 59, 999);
    builder = builder.lte("sent_at", end.toISOString());
  }

  return builder;
}

function applyAdminListSort(query: any, sort: NotificationCampaignListFilters["sort"]) {
  if (sort === "scheduled") {
    return query.order("scheduled_at", { ascending: true, nullsFirst: false });
  }
  if (sort === "sent") {
    return query.order("sent_at", { ascending: false, nullsFirst: false });
  }
  if (sort === "created") {
    return query.order("created_at", { ascending: false });
  }
  if (sort === "recipients") {
    return query
      .order("estimated_recipient_count", { ascending: false })
      .order("updated_at", { ascending: false });
  }
  if (sort === "errors") {
    return query.order("status", { ascending: true }).order("updated_at", { ascending: false });
  }
  return query.order("updated_at", { ascending: false });
}

export async function getNotificationCampaignStats(): Promise<{
  stats: NotificationCampaignStats;
  error: string | null;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notification_campaigns")
    .select("id, status, estimated_recipient_count, updated_at");

  if (error) {
    return {
      stats: emptyCampaignStats(),
      error: error.message
    };
  }

  const rows = data ?? [];
  const stats = emptyCampaignStats();
  stats.total = rows.length;

  for (const row of rows) {
    const status = String(row.status) as CampaignStatus;
    if (status === "draft") stats.draft += 1;
    else if (status === "scheduled") stats.scheduled += 1;
    else if (status === "sending") stats.sending += 1;
    else if (status === "sent") stats.sent += 1;
    else if (status === "paused") stats.paused += 1;
    else if (status === "failed") stats.failed += 1;
    else if (status === "cancelled") stats.cancelled += 1;
    else if (status === "archived") stats.archived += 1;
  }

  const sorted = [...rows].sort(
    (a, b) => new Date(String(b.updated_at)).getTime() - new Date(String(a.updated_at)).getTime()
  );
  if (sorted[0]) {
    stats.latestEstimatedRecipients = Number(sorted[0].estimated_recipient_count ?? 0);
  }

  const sentIds = rows.filter((row) => row.status === "sent").map((row) => String(row.id));
  if (sentIds.length > 0) {
    const delivery = await getCampaignDeliveryStatsBatch(supabase, sentIds.slice(0, 50));
    const rates = Object.values(delivery).map((item) => item.open_rate).filter((rate) => rate > 0);
    if (rates.length > 0) {
      stats.avgOpenRate = Math.round((rates.reduce((sum, rate) => sum + rate, 0) / rates.length) * 10) / 10;
    }
  }

  return { stats, error: null };
}

function emptyCampaignStats(): NotificationCampaignStats {
  return {
    total: 0,
    draft: 0,
    scheduled: 0,
    sending: 0,
    sent: 0,
    paused: 0,
    failed: 0,
    cancelled: 0,
    archived: 0,
    avgOpenRate: 0,
    latestEstimatedRecipients: 0
  };
}

async function getCampaignDeliveryStatsBatch(
  supabase: Awaited<ReturnType<typeof createClient>>,
  campaignIds: string[]
): Promise<Record<string, NotificationCampaignDeliveryStats>> {
  const result: Record<string, NotificationCampaignDeliveryStats> = {};

  for (const id of campaignIds) {
    result[id] = {
      sent_count: 0,
      failed_count: 0,
      open_count: 0,
      click_count: 0,
      open_rate: 0,
      click_rate: 0
    };
  }

  const { data, error } = await supabase
    .from("user_notifications")
    .select("campaign_id, is_read, href")
    .in("campaign_id", campaignIds);

  if (error || !data) {
    return result;
  }

  for (const row of data) {
    const campaignId = String(row.campaign_id);
    const stats = result[campaignId];
    if (!stats) continue;
    stats.sent_count += 1;
    if (row.is_read) {
      stats.open_count += 1;
      if (row.href) stats.click_count += 1;
    }
  }

  for (const id of campaignIds) {
    const stats = result[id];
    if (stats.sent_count > 0) {
      stats.open_rate = Math.round((stats.open_count / stats.sent_count) * 1000) / 10;
      stats.click_rate = Math.round((stats.click_count / stats.sent_count) * 1000) / 10;
    }
  }

  return result;
}

export async function attachCampaignDeliveryStats(
  campaigns: NotificationCampaign[]
): Promise<NotificationCampaign[]> {
  if (campaigns.length === 0) return campaigns;
  const supabase = await createClient();
  const sentIds = campaigns.filter((item) => item.status === "sent").map((item) => item.id);
  if (sentIds.length === 0) return campaigns;

  const batch = await getCampaignDeliveryStatsBatch(supabase, sentIds);
  return campaigns.map((campaign) => ({
    ...campaign,
    delivery_stats: batch[campaign.id]
  }));
}

export async function listNotificationCampaigns(
  options: ListInput = {}
): Promise<{ items: NotificationCampaign[]; total: number; error: string | null }> {
  const supabase = await createClient();
  const isAdminFilters = "page" in options;
  const limit = isAdminFilters ? options.pageSize : (options.limit ?? 50);
  const offset = isAdminFilters
    ? (options.page - 1) * options.pageSize
    : (options.offset ?? 0);

  let query = supabase.from("notification_campaigns").select("*", { count: "exact" });

  if (isAdminFilters) {
    query = applyAdminListFilters(query, options);
    query = applyAdminListSort(query, options.sort);
  } else {
    if ("status" in options && options.status) {
      const statuses = Array.isArray(options.status) ? options.status : [options.status];
      query = query.in("status", statuses);
    }
    query = query.order("updated_at", { ascending: false });
  }

  const { data, error, count } = await query.range(offset, offset + limit - 1);

  if (error) {
    return { items: [], total: 0, error: error.message };
  }

  let items = (data ?? []).map((row) => mapCampaign(row as Record<string, unknown>));
  if (isAdminFilters) {
    items = await attachCampaignDeliveryStats(items);
  }

  return {
    items,
    total: count ?? 0,
    error: null
  };
}

export async function getNotificationCampaignById(
  id: string
): Promise<{ item: NotificationCampaign | null; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notification_campaigns")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return { item: null, error: error.message };
  }

  return {
    item: data ? mapCampaign(data as Record<string, unknown>) : null,
    error: null
  };
}

export async function createNotificationCampaign(
  input: CreateNotificationCampaignInput
): Promise<{ item: NotificationCampaign | null; error: string | null }> {
  const supabase = await createClient();
  const extended = await hasExtendedNotificationCampaignSchema(supabase);
  const payload = buildCampaignInsertPayload(input as Record<string, unknown>, extended);

  const { data, error } = await supabase
    .from("notification_campaigns")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    return { item: null, error: error.message };
  }

  const item = mapCampaign(data as Record<string, unknown>);
  await appendNotificationCampaignAuditLog(supabase, {
    campaignId: item.id,
    actorId: input.created_by ?? null,
    action: "create",
    metadata: { status: item.status }
  });

  return { item, error: null };
}

export async function updateNotificationCampaign(
  id: string,
  input: UpdateNotificationCampaignInput,
  actorId?: string | null
): Promise<{ item: NotificationCampaign | null; error: string | null }> {
  const supabase = await createClient();
  const extended = await hasExtendedNotificationCampaignSchema(supabase);
  const payload = buildCampaignUpdatePayload(
    { ...input, updated_by: actorId ?? input.updated_by ?? null } as Record<string, unknown>,
    extended
  );

  const { data, error } = await supabase
    .from("notification_campaigns")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return { item: null, error: error.message };
  }

  const item = mapCampaign(data as Record<string, unknown>);
  await appendNotificationCampaignAuditLog(supabase, {
    campaignId: id,
    actorId: actorId ?? null,
    action: "update",
    metadata: { status: item.status }
  });

  return { item, error: null };
}

export async function deleteNotificationCampaign(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase.from("notification_campaigns").delete().eq("id", id);
  return { error: error?.message ?? null };
}

export async function duplicateNotificationCampaign(
  id: string,
  actorId: string | null
): Promise<{ item: NotificationCampaign | null; error: string | null }> {
  const { item: source, error: loadError } = await getNotificationCampaignById(id);
  if (loadError || !source) {
    return { item: null, error: loadError ?? "Không tìm thấy campaign." };
  }

  const result = await createNotificationCampaign({
    name: source.name ? `${source.name} (bản sao)` : null,
    title: source.title,
    message: source.message,
    notification_type: source.notification_type,
    priority: source.priority,
    visual_style: source.visual_style,
    action_type: source.action_type,
    action_target_id: source.action_target_id,
    href: source.href,
    channel_in_app: source.channel_in_app,
    channel_email: source.channel_email,
    channel_banner: source.channel_banner,
    channel_popup: source.channel_popup,
    target_mode: source.target_mode,
    target_segments: source.target_segments,
    manual_user_ids: source.manual_user_ids,
    status: "draft",
    scheduled_at: null,
    expires_at: source.expires_at,
    created_by: actorId
  });

  if (result.item) {
    const supabase = await createClient();
    await appendNotificationCampaignAuditLog(supabase, {
      campaignId: result.item.id,
      actorId,
      action: "clone",
      metadata: { source_id: id }
    });
  }

  return result;
}

export async function estimateNotificationRecipients(
  campaign: Pick<
    NotificationCampaign,
    "target_mode" | "target_segments" | "manual_user_ids"
  >
): Promise<number> {
  return estimateCampaignRecipientCount(campaign);
}

export async function resolveCampaignRecipientUserIdsFromCampaign(
  campaign: Pick<
    NotificationCampaign,
    "target_mode" | "target_segments" | "manual_user_ids"
  >
): Promise<string[]> {
  return resolveCampaignRecipientUserIds(campaign);
}

export async function sendNotificationCampaign(campaignId: string): Promise<{
  created: number;
  error: string | null;
}> {
  const { item: campaign, error: loadError } = await getNotificationCampaignById(campaignId);

  if (loadError || !campaign) {
    return { created: 0, error: loadError ?? "Không tìm thấy campaign." };
  }

  if (campaign.status === "sent") {
    return { created: 0, error: "Campaign đã được gửi." };
  }

  if (campaign.status === "sending") {
    return { created: 0, error: "Campaign đang được gửi." };
  }

  if (!campaign.channel_in_app) {
    return { created: 0, error: "Campaign chưa bật kênh in-app." };
  }

  if (campaign.channel_email) {
    return { created: 0, error: "Email chưa được cấu hình — chỉ gửi in-app trong MVP." };
  }

  const recipientIds = await resolveCampaignRecipientUserIds(campaign);
  const estimate = recipientIds.length;

  await updateNotificationCampaign(campaignId, {
    status: "sending",
    estimated_recipient_count: estimate
  });

  const delivery = await createUserNotificationsForCampaign(campaign, recipientIds);

  if (delivery.error) {
    await updateNotificationCampaign(campaignId, { status: "paused" });
    return delivery;
  }

  await updateNotificationCampaign(campaignId, {
    status: "sent",
    sent_at: new Date().toISOString(),
    estimated_recipient_count: delivery.created
  });

  return delivery;
}

export async function createUserNotificationsForCampaign(
  campaign: NotificationCampaign,
  recipientUserIds: string[]
): Promise<{ created: number; error: string | null }> {
  if (!campaign.channel_in_app || recipientUserIds.length === 0) {
    return { created: 0, error: null };
  }

  const supabase = await createClient();
  const uniqueIds = [...new Set(recipientUserIds)];
  const batchSize = 500;
  let created = 0;
  const href = sanitizeUserNotificationHref(campaign.href);

  for (let i = 0; i < uniqueIds.length; i += batchSize) {
    const batch = uniqueIds.slice(i, i + batchSize);
    const rows = batch.map((userId) => ({
      user_id: userId,
      campaign_id: campaign.id,
      title: campaign.title,
      message: campaign.message,
      notification_type: campaign.notification_type,
      href
    }));

    const { error, count } = await supabase
      .from("user_notifications")
      .upsert(rows, {
        onConflict: "user_id,campaign_id",
        ignoreDuplicates: true,
        count: "exact"
      });

    if (error) {
      return { created, error: error.message };
    }

    created += count ?? batch.length;
  }

  return { created, error: null };
}

export async function listUserNotifications(
  options: import("@/types/platform-content").ListUserNotificationsOptions
): Promise<{ items: UserNotification[]; error: string | null }> {
  const supabase = await createClient();
  const limit = options.limit ?? 30;
  const offset = options.offset ?? 0;

  let query = supabase
    .from("user_notifications")
    .select("*")
    .eq("user_id", options.userId)
    .order("created_at", { ascending: false });

  if (options.unreadOnly) {
    query = query.eq("is_read", false);
  }

  const { data, error } = await query.range(offset, offset + limit - 1);

  if (error) {
    return { items: [], error: error.message };
  }

  return {
    items: (data ?? []).map((row) => mapUserNotification(row as Record<string, unknown>)),
    error: null
  };
}

export async function getUnreadCampaignNotificationCount(userId: string) {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("user_notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) {
    return 0;
  }

  return count ?? 0;
}

export async function markNotificationRead(
  userId: string,
  notificationId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("user_notifications")
    .update({
      is_read: true,
      read_at: new Date().toISOString()
    })
    .eq("id", notificationId)
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

export async function markAllUserNotificationsRead(
  userId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("user_notifications")
    .update({
      is_read: true,
      read_at: new Date().toISOString()
    })
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

export async function updateNotificationCampaignStatus(
  id: string,
  status: CampaignStatus
) {
  return updateNotificationCampaign(id, { status });
}

// Re-export segment helpers for backwards compatibility
export {
  estimateCampaignRecipientCount,
  resolveCampaignRecipientUserIds
} from "@/lib/platform-content/campaign-segments";

export async function listSeoRules(): Promise<{
  items: import("@/types/platform-content").SeoRule[];
  error: string | null;
}> {
  const { listSeoRulesFromDb } = await import("@/lib/seo/rules");
  return listSeoRulesFromDb();
}

export async function updateSeoRule(
  id: string,
  input: Partial<import("@/types/platform-content").SeoRule>
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase.from("seo_rules").update(input).eq("id", id);

  return { error: error?.message ?? null };
}

export async function listSeoAuditLogs(limit = 50): Promise<{
  items: import("@/types/platform-content").SeoAuditLog[];
  error: string | null;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("seo_audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return { items: [], error: error.message };
  }

  return {
    items: (data ?? []).map((row) => ({
      id: String(row.id),
      route: String(row.route),
      page_type: row.page_type ? String(row.page_type) : null,
      issue_type: String(row.issue_type),
      severity: row.severity as import("@/types/platform-content").SeoAuditLog["severity"],
      message: String(row.message),
      metadata: (row.metadata as Record<string, unknown>) ?? {},
      created_at: String(row.created_at)
    })),
    error: null
  };
}
