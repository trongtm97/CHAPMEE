import type { NotificationCampaignListFilters } from "@/types/admin-notification-campaigns";
import {
  NOTIFICATION_CAMPAIGN_PAGE_SIZE_DEFAULT,
  NOTIFICATION_CAMPAIGN_SEGMENTS
} from "@/types/admin-notification-campaigns";
import type { CampaignNotificationType, CampaignStatus } from "@/types/platform-content";
import { CAMPAIGN_NOTIFICATION_TYPES } from "@/types/platform-content";

export function getDefaultNotificationCampaignListFilters(): NotificationCampaignListFilters {
  return {
    search: "",
    status: "all",
    notificationType: "all",
    channel: "all",
    segment: "all",
    createdFrom: "",
    createdTo: "",
    sentFrom: "",
    sentTo: "",
    sort: "updated",
    page: 1,
    pageSize: NOTIFICATION_CAMPAIGN_PAGE_SIZE_DEFAULT
  };
}

export function parseNotificationCampaignListFilters(
  query: Record<string, string | string[] | undefined>
): NotificationCampaignListFilters {
  const defaults = getDefaultNotificationCampaignListFilters();
  const rawStatus = pickString(query.status) ?? defaults.status;
  const rawType = pickString(query.type) ?? defaults.notificationType;
  const rawChannel = pickString(query.channel) ?? defaults.channel;
  const rawSegment = pickString(query.segment) ?? defaults.segment;
  const rawSort = pickString(query.sort) ?? defaults.sort;
  const page = Math.max(1, Number(pickString(query.page) ?? defaults.page));
  const pageSize = Math.min(
    100,
    Math.max(25, Number(pickString(query.pageSize) ?? defaults.pageSize))
  );

  const statusValues = [
    "draft",
    "scheduled",
    "sending",
    "sent",
    "paused",
    "cancelled",
    "failed",
    "archived"
  ];

  const status =
    rawStatus === "all" || statusValues.includes(rawStatus)
      ? (rawStatus as NotificationCampaignListFilters["status"])
      : defaults.status;

  const notificationType =
    rawType === "all" || CAMPAIGN_NOTIFICATION_TYPES.includes(rawType as CampaignNotificationType)
      ? (rawType as NotificationCampaignListFilters["notificationType"])
      : defaults.notificationType;

  const channel =
    rawChannel === "all" ||
    rawChannel === "in_app" ||
    rawChannel === "push" ||
    rawChannel === "email"
      ? rawChannel
      : defaults.channel;

  const segment =
    rawSegment === "all" ||
    NOTIFICATION_CAMPAIGN_SEGMENTS.includes(
      rawSegment as (typeof NOTIFICATION_CAMPAIGN_SEGMENTS)[number]
    )
      ? (rawSegment as NotificationCampaignListFilters["segment"])
      : defaults.segment;

  const sortValues = [
    "updated",
    "created",
    "scheduled",
    "sent",
    "recipients",
    "open_rate",
    "errors"
  ];
  const sort = sortValues.includes(rawSort)
    ? (rawSort as NotificationCampaignListFilters["sort"])
    : defaults.sort;

  return {
    search: pickString(query.search) ?? defaults.search,
    status,
    notificationType,
    channel,
    segment,
    createdFrom: pickString(query.createdFrom) ?? defaults.createdFrom,
    createdTo: pickString(query.createdTo) ?? defaults.createdTo,
    sentFrom: pickString(query.sentFrom) ?? defaults.sentFrom,
    sentTo: pickString(query.sentTo) ?? defaults.sentTo,
    sort,
    page,
    pageSize
  };
}

export function buildNotificationCampaignListQuery(
  filters: NotificationCampaignListFilters
): string {
  const params = new URLSearchParams();
  if (filters.search.trim()) params.set("search", filters.search.trim());
  if (filters.status !== "all") params.set("status", filters.status);
  if (filters.notificationType !== "all") params.set("type", filters.notificationType);
  if (filters.channel !== "all") params.set("channel", filters.channel);
  if (filters.segment !== "all") params.set("segment", filters.segment);
  if (filters.createdFrom) params.set("createdFrom", filters.createdFrom);
  if (filters.createdTo) params.set("createdTo", filters.createdTo);
  if (filters.sentFrom) params.set("sentFrom", filters.sentFrom);
  if (filters.sentTo) params.set("sentTo", filters.sentTo);
  if (filters.sort !== "updated") params.set("sort", filters.sort);
  if (filters.page > 1) params.set("page", String(filters.page));
  if (filters.pageSize !== NOTIFICATION_CAMPAIGN_PAGE_SIZE_DEFAULT) {
    params.set("pageSize", String(filters.pageSize));
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function countActiveNotificationCampaignFilters(
  filters: NotificationCampaignListFilters
): number {
  let count = 0;
  if (filters.search.trim()) count += 1;
  if (filters.status !== "all") count += 1;
  if (filters.notificationType !== "all") count += 1;
  if (filters.channel !== "all") count += 1;
  if (filters.segment !== "all") count += 1;
  if (filters.createdFrom) count += 1;
  if (filters.createdTo) count += 1;
  if (filters.sentFrom) count += 1;
  if (filters.sentTo) count += 1;
  return count;
}

function pickString(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

export function campaignTargetsAllUsers(input: {
  target_mode: string;
  target_segments: string[];
}) {
  return input.target_mode === "all" || input.target_segments.includes("all_users");
}

export function formatCampaignTargetSummary(campaign: {
  target_mode: string;
  target_segments: string[];
  manual_user_ids: string[];
}) {
  if (campaign.target_mode === "all") {
    return "Tất cả người dùng";
  }
  if (campaign.target_mode === "manual") {
    return `${campaign.manual_user_ids.length} người được chọn`;
  }
  if (campaign.target_segments.length === 0) {
    return "—";
  }
  return `${campaign.target_segments.length} nhóm`;
}

export function formatCampaignChannels(campaign: {
  channel_in_app: boolean;
  channel_email: boolean;
  channel_banner: boolean;
  channel_popup: boolean;
}) {
  const channels: string[] = [];
  if (campaign.channel_in_app) channels.push("In-app");
  if (campaign.channel_popup) channels.push("Popup");
  if (campaign.channel_banner) channels.push("Banner");
  if (campaign.channel_email) channels.push("Email");
  return channels.join(", ") || "—";
}
