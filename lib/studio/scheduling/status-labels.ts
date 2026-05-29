import type { ScheduledPublicationStatus } from "@/types/scheduling";

export const SCHEDULE_STATUS_LABELS: Record<ScheduledPublicationStatus, string> = {
  canceled: "Đã hủy",
  failed: "Lỗi đăng",
  published: "Đã đăng",
  scheduled: "Đã lên lịch"
};

export const TARGET_TYPE_LABELS = {
  chapter: "Chương",
  story: "Truyện",
  swipe: "Swipe"
} as const;
