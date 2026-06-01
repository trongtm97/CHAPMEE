import type { CampaignNotificationType } from "@/types/platform-content";

export const CAMPAIGN_NOTIFICATION_TYPE_LABELS: Record<CampaignNotificationType, string> = {
  system: "Hệ thống",
  policy: "Chính sách",
  monetization: "Kiếm tiền",
  account: "Tài khoản",
  story: "Truyện",
  chapter: "Chương",
  event: "Sự kiện",
  warning: "Cảnh báo",
  marketing: "Tin mới"
};

export function getCampaignNotificationTypeLabel(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  return CAMPAIGN_NOTIFICATION_TYPE_LABELS[value as CampaignNotificationType] ?? null;
}
