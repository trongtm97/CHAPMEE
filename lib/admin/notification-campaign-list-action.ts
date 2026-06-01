"use server";

import {
  attachCampaignDeliveryStats,
  getNotificationCampaignStats,
  listNotificationCampaigns
} from "@/lib/platform-content/notification-campaigns";
import type { NotificationCampaignListFilters } from "@/types/admin-notification-campaigns";
import type { NotificationCampaignStats } from "@/types/admin-notification-campaigns";
import type { NotificationCampaign } from "@/types/platform-content";

export async function listNotificationCampaignsForAdminAction(
  filters: NotificationCampaignListFilters
): Promise<{ items: NotificationCampaign[]; total: number; error: string | null }> {
  const { checkStaffPermission } = await import("@/lib/auth/staff-guards");
  const staff = await checkStaffPermission("notification.campaign.view");

  if (!staff.ok) {
    return { items: [], total: 0, error: staff.error };
  }

  return listNotificationCampaigns(filters);
}

export async function getNotificationCampaignStatsForAdminAction(): Promise<{
  stats: NotificationCampaignStats | null;
  error: string | null;
}> {
  const { checkStaffPermission } = await import("@/lib/auth/staff-guards");
  const staff = await checkStaffPermission("notification.campaign.view");

  if (!staff.ok) {
    return { stats: null, error: staff.error };
  }

  const result = await getNotificationCampaignStats();
  return { stats: result.stats, error: result.error };
}

export async function listNotificationCampaignIdsForBulkAction(
  filters: NotificationCampaignListFilters
): Promise<string[]> {
  const result = await listNotificationCampaignsForAdminAction({
    ...filters,
    page: 1,
    pageSize: 500
  });
  return result.items.map((item) => item.id);
}

export async function exportNotificationCampaignsCsvAction(
  filters: NotificationCampaignListFilters
): Promise<{ csv: string; error: string | null }> {
  const result = await listNotificationCampaignsForAdminAction({
    ...filters,
    page: 1,
    pageSize: 500
  });

  if (result.error) {
    return { csv: "", error: result.error };
  }

  const items = await attachCampaignDeliveryStats(result.items);
  const header = [
    "id",
    "name",
    "title",
    "message",
    "type",
    "status",
    "channels",
    "target_mode",
    "estimated_recipients",
    "open_rate",
    "created_at",
    "scheduled_at",
    "sent_at"
  ].join(",");

  const rows = items.map((item) =>
    [
      item.id,
      csvEscape(item.name ?? ""),
      csvEscape(item.title),
      csvEscape(item.message),
      item.notification_type,
      item.status,
      csvEscape(formatChannels(item)),
      item.target_mode,
      item.estimated_recipient_count,
      item.delivery_stats?.open_rate ?? 0,
      item.created_at,
      item.scheduled_at ?? "",
      item.sent_at ?? ""
    ].join(",")
  );

  return { csv: [header, ...rows].join("\n"), error: null };
}

function csvEscape(value: string) {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatChannels(item: NotificationCampaign) {
  const channels: string[] = [];
  if (item.channel_in_app) channels.push("in_app");
  if (item.channel_popup) channels.push("popup");
  if (item.channel_banner) channels.push("banner");
  if (item.channel_email) channels.push("email");
  return channels.join("|");
}
