import type { ScheduledPublicationStatus, ScheduledTargetType } from "@/types/scheduling";

export const SCHEDULE_STATUS_LABELS: Record<ScheduledPublicationStatus, string> = {
  canceled: "Đã hủy",
  failed: "Lỗi đăng",
  published: "Đã đăng",
  scheduled: "Đã lên lịch"
};

export const TARGET_TYPE_LABELS: Record<ScheduledTargetType, string> = {
  chapter: "Chương",
  reels: "Reels",
  story: "Truyện"
};

export function storyScheduleEventLabel(
  storyTitle: string,
  structureType: "chaptered" | "standalone" | null | undefined
) {
  if (structureType === "standalone") {
    return `Đăng truyện một phần: ${storyTitle}`;
  }
  return storyTitle;
}

export function chapterScheduleEventLabel(
  chapterTitle: string,
  storyTitle: string | null
) {
  if (storyTitle) {
    return `Đăng chương: ${chapterTitle} — ${storyTitle}`;
  }
  return `Đăng chương: ${chapterTitle}`;
}
