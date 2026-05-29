import type { StudioDisplayStatus } from "@/types/studio";
import type { StudioDbContentStatus } from "@/types/studio";

export const STORY_STATUS_LABELS: Record<StudioDisplayStatus, string> = {
  draft: "Nháp",
  scheduled: "Đã lên lịch",
  published: "Đang đăng",
  paused: "Tạm dừng",
  completed: "Hoàn thành",
  hidden: "Đã ẩn",
  under_review: "Đang duyệt",
  rejected: "Cần sửa"
};

export function getChapterStatusLabel(status: StudioDisplayStatus): string {
  switch (status) {
    case "published":
      return "Đã đăng";
    case "scheduled":
      return "Đã lên lịch";
    case "hidden":
      return "Đã ẩn";
    case "under_review":
      return "Đang duyệt";
    case "rejected":
      return "Cần sửa";
    case "draft":
      return "Nháp";
    default:
      return getStoryStatusLabel(status);
  }
}

export function getStoryStatusLabel(status: StudioDisplayStatus): string {
  return STORY_STATUS_LABELS[status];
}

export const STORY_STATUS_BADGE_CLASS: Record<StudioDisplayStatus, string> = {
  draft: "border-zinc-500/40 bg-zinc-500/10 text-zinc-300",
  scheduled: "border-amber-400/40 bg-amber-400/10 text-amber-200",
  published: "border-emerald-400/40 bg-emerald-400/10 text-emerald-200",
  paused: "border-orange-400/40 bg-orange-400/10 text-orange-200",
  completed: "border-sky-400/40 bg-sky-400/10 text-sky-200",
  hidden: "border-zinc-600/50 bg-zinc-800/60 text-zinc-400",
  under_review: "border-violet-400/40 bg-violet-400/10 text-violet-200",
  rejected: "border-rose-400/40 bg-rose-400/10 text-rose-200"
};

type StoryStatusInput = {
  status: StudioDbContentStatus;
  visibility: "public" | "private";
  isCompleted: boolean;
};

export function resolveStoryDisplayStatus({
  isCompleted,
  status,
  visibility
}: StoryStatusInput): StudioDisplayStatus {
  if (status === "archived") {
    return "hidden";
  }

  if (status === "rejected") {
    return "rejected";
  }

  if (status === "draft") {
    return "draft";
  }

  if (status === "pending") {
    return "under_review";
  }

  if (status === "approved") {
    return visibility === "private" ? "scheduled" : "scheduled";
  }

  if (status === "published") {
    if (visibility === "private") {
      return "hidden";
    }

    if (isCompleted) {
      return "completed";
    }

    return "published";
  }

  return "draft";
}

type ChapterStatusInput = {
  status: StudioDbContentStatus;
};

export function resolveChapterDisplayStatus({
  status
}: ChapterStatusInput): StudioDisplayStatus {
  if (status === "archived") {
    return "hidden";
  }

  if (status === "rejected") {
    return "rejected";
  }

  if (status === "draft") {
    return "draft";
  }

  if (status === "pending") {
    return "under_review";
  }

  if (status === "approved") {
    return "scheduled";
  }

  if (status === "published") {
    return "published";
  }

  return "draft";
}
