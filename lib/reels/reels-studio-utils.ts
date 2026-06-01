import { studioPath } from "@/lib/studio/constants";
import type {
  ReelsItemListItem,
  ReelsItemStatus,
  ReelsSourceType,
  ReelsStudioListItem,
  ReelsStudioStats,
  ReelsTaskCategory,
  ReelsTaskItem
} from "@/types/reels";

const MS_DAY = 24 * 60 * 60 * 1000;

export const REELS_STATUS_LABELS: Record<ReelsItemStatus, string> = {
  draft: "Nháp",
  hidden: "Đã ẩn",
  published: "Đang đăng",
  rejected: "Cần sửa",
  scheduled: "Đã lên lịch"
};

export function sourceLabel(sourceType: ReelsSourceType | null) {
  if (!sourceType || sourceType === "manual") {
    return "Tạo thủ công";
  }

  if (
    sourceType === "chapter_start" ||
    sourceType === "dialogue" ||
    sourceType === "ending" ||
    sourceType === "manual_selection"
  ) {
    return "Tạo từ chương";
  }

  if (sourceType === "story_description") {
    return "Từ mô tả truyện";
  }

  return "Tạo thủ công";
}

export function computeCtr(viewCount: number, ctaClickCount: number) {
  if (viewCount <= 0) {
    return 0;
  }

  return Math.round((ctaClickCount / viewCount) * 1000) / 10;
}

export function enrichReelsListItem(
  item: ReelsItemListItem & { genreId?: string | null; genreName?: string | null }
): ReelsStudioListItem {
  const ctr = computeCtr(item.viewCount, item.ctaClickCount);
  const isLowCtr =
    item.status === "published" && item.viewCount >= 20 && ctr < 2;
  const needsAttention =
    item.status === "rejected" ||
    !item.hook.trim() ||
    !item.body.trim() ||
    !item.storyId ||
    isLowCtr;

  return {
    ...item,
    commentCount: 0,
    ctr,
    displayTitle: item.title?.trim() || item.hook || "Reels không tiêu đề",
    genreId: item.genreId ?? null,
    genreName: item.genreName ?? null,
    isLowCtr,
    needsAttention,
    saveCount: 0,
    sourceLabel: sourceLabel(item.sourceType)
  };
}

function isWithinDays(iso: string | null, days: number, now = Date.now()) {
  if (!iso) {
    return false;
  }

  const ts = new Date(iso).getTime();
  return ts >= now - days * MS_DAY;
}

export function computeReelsStats(items: ReelsStudioListItem[]): ReelsStudioStats {
  const now = Date.now();
  const recent = items.filter(
    (item) =>
      isWithinDays(item.publishedAt, 7, now) ||
      isWithinDays(item.updatedAt, 7, now)
  );

  const views7d = recent.reduce((sum, item) => sum + item.viewCount, 0);
  const reads7d = recent.reduce((sum, item) => sum + item.ctaClickCount, 0);
  const ctr7d = computeCtr(views7d, reads7d);

  return {
    ctr7d,
    draft: items.filter((item) => item.status === "draft").length,
    needsFix: items.filter((item) => item.status === "rejected").length,
    published: items.filter((item) => item.status === "published").length,
    reads7d,
    readsFromReels: items.reduce((sum, item) => sum + item.ctaClickCount, 0),
    scheduled: items.filter((item) => item.status === "scheduled").length,
    total: items.length,
    views7d
  };
}

export function buildReelsTasks(
  items: ReelsStudioListItem[],
  limit = 5
): ReelsTaskItem[] {
  const tasks: ReelsTaskItem[] = [];

  for (const item of items) {
    const editHref = studioPath(`/reels/${item.id}/edit`);

    if (item.status === "draft" && (!item.hook.trim() || !item.body.trim())) {
      tasks.push({
        category: "draft",
        description: "Hoàn thiện hook và nội dung trích dẫn.",
        id: `draft-${item.id}`,
        primaryAction: { href: editHref, label: "Sửa" },
        secondaryAction: { href: editHref, label: "Tiếp tục" },
        title: item.displayTitle
      });
    } else if (item.status === "rejected") {
      tasks.push({
        category: "needs_fix",
        description: "Reels bị từ chối hoặc cần chỉnh sửa trước khi đăng lại.",
        id: `fix-${item.id}`,
        primaryAction: { href: editHref, label: "Sửa" },
        title: item.displayTitle
      });
    } else if (!item.chapterId && item.status !== "hidden") {
      tasks.push({
        category: "draft",
        description: "Gắn chương để CTA dẫn đúng nội dung đọc.",
        id: `chapter-${item.id}`,
        primaryAction: { href: editHref, label: "Gắn chương" },
        title: item.displayTitle
      });
    } else if (item.isLowCtr) {
      tasks.push({
        category: "low_performance",
        description: `CTR ${item.ctr}% — thử đổi hook hoặc đoạn mở đầu.`,
        id: `ctr-${item.id}`,
        primaryAction: { href: editHref, label: "Tối ưu" },
        secondaryAction: {
          href: `${editHref}?preview=1`,
          label: "Xem Reels"
        },
        title: item.displayTitle
      });
    } else if (
      item.status === "scheduled" &&
      item.scheduledAt &&
      new Date(item.scheduledAt).getTime() - Date.now() < MS_DAY
    ) {
      tasks.push({
        category: "upcoming",
        description: "Sắp đến giờ đăng — kiểm tra lại trước khi phát hành.",
        id: `sched-${item.id}`,
        primaryAction: { href: editHref, label: "Lên lịch" },
        secondaryAction: {
          href: `${editHref}?preview=1`,
          label: "Xem Reels"
        },
        title: item.displayTitle
      });
    } else if (!item.hook.trim()) {
      tasks.push({
        category: "draft",
        description: "Thiếu hook — thêm câu mở đầu thu hút.",
        id: `hook-${item.id}`,
        primaryAction: { href: editHref, label: "Sửa" },
        title: item.displayTitle
      });
    }
  }

  return tasks.slice(0, limit);
}

export function filterTasksByCategory(
  tasks: ReelsTaskItem[],
  category: ReelsTaskCategory
) {
  if (category === "all") {
    return tasks;
  }

  return tasks.filter((task) => task.category === category);
}

export function sortReelsItems<T extends ReelsStudioListItem>(
  items: T[],
  sort: import("@/types/reels").ReelsListSort
) {
  const sorted = [...items];

  sorted.sort((a, b) => {
    switch (sort) {
      case "created":
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case "views":
        return b.viewCount - a.viewCount;
      case "ctr":
        return b.ctr - a.ctr;
      case "reads":
        return b.ctaClickCount - a.ctaClickCount;
      case "needs_attention":
        return Number(b.needsAttention) - Number(a.needsAttention) ||
          b.ctr - a.ctr;
      case "updated":
      default:
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    }
  });

  return sorted;
}
