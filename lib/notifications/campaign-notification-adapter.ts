import type { CampaignNotificationType } from "@/types/platform-content";
import type { NotificationItem, NotificationType } from "@/types/notification";
import type { UserNotification } from "@/types/platform-content";

export const USER_CAMPAIGN_NOTIFICATION_PREFIX = "ucn:";

const CAMPAIGN_TYPE_MAP: Record<CampaignNotificationType, NotificationType> = {
  system: "community_guideline_update",
  policy: "community_guideline_update",
  monetization: "creator_revenue_received",
  account: "welcome",
  story: "new_chapter_from_followed_story",
  chapter: "new_chapter_from_followed_story",
  event: "challenge_result_announced",
  warning: "content_quality_warning",
  marketing: "onboarding_reminder"
};

export function isCampaignNotificationId(id: string) {
  return id.startsWith(USER_CAMPAIGN_NOTIFICATION_PREFIX);
}

export function stripCampaignNotificationId(id: string) {
  return isCampaignNotificationId(id) ? id.slice(USER_CAMPAIGN_NOTIFICATION_PREFIX.length) : id;
}

export function toCampaignNotificationId(id: string) {
  return `${USER_CAMPAIGN_NOTIFICATION_PREFIX}${id}`;
}

export function mapUserNotificationToNotificationItem(
  item: UserNotification
): NotificationItem {
  return {
    id: toCampaignNotificationId(item.id),
    user_id: item.user_id,
    type: CAMPAIGN_TYPE_MAP[item.notification_type] ?? "community_guideline_update",
    title: item.title,
    body: item.message,
    target_type: null,
    target_id: item.campaign_id,
    action_url: item.href,
    metadata: {
      context_label: "Thông báo nền tảng",
      campaign_type: item.notification_type
    },
    read_at: item.is_read ? item.read_at ?? item.created_at : null,
    created_at: item.created_at
  };
}
