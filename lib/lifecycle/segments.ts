import type {
  LifecycleNudgeConfig,
  LifecycleNudgeKey,
  LifecycleNudgePlacement,
  LifecycleSegment
} from "@/types/lifecycle";
import { REELS_PUBLIC_PATH } from "@/lib/routes/reels-paths";

export const lifecycleNudges: LifecycleNudgeConfig[] = [
  {
    key: "new_user_no_action",
    segment: "new_user_no_action",
    title: "Bắt đầu xem Reels đầu tiên",
    description: "Lướt xem Reels để tìm một truyện hợp gu với bạn.",
    ctaLabel: "Xem Reels",
    ctaHref: REELS_PUBLIC_PATH,
    placements: ["reels", "me"],
    cooldownHours: 24,
    dismissCooldownHours: 72
  },
  {
    key: "reels_viewer_no_follow",
    segment: "reels_viewer_no_follow",
    title: "Thấy truyện cuốn? Theo dõi để không mất dấu",
    description: "Lưu hoặc theo dõi truyện để nhận chương mới nhanh hơn.",
    ctaLabel: "Khám phá truyện hot",
    ctaHref: "/discover",
    placements: ["reels", "me"],
    cooldownHours: 24,
    dismissCooldownHours: 72
  },
  {
    key: "reader_no_comment",
    segment: "reader_no_comment",
    title: "Bạn nghĩ nhân vật nên làm gì tiếp?",
    description: "Bỏ phiếu hoặc bình luận nhẹ để tác giả biết ý kiến của bạn.",
    ctaLabel: "Bỏ phiếu hoặc bình luận",
    ctaHref: "/community",
    placements: ["reels", "me"],
    cooldownHours: 24,
    dismissCooldownHours: 72
  },
  {
    key: "author_no_story",
    segment: "author_no_story",
    title: "Đăng truyện đầu tiên của bạn",
    description: "Một truyện ngắn là đủ để mở hồ sơ tác giả.",
    ctaLabel: "Tạo truyện",
    ctaHref: "/creator/stories/new",
    placements: ["creator", "me"],
    cooldownHours: 12,
    dismissCooldownHours: 48
  },
  {
    key: "author_has_story_no_recent_update",
    segment: "author_has_story_no_recent_update",
    title: "Độc giả đang chờ chương mới",
    description: "Cập nhật một chương ngắn để giữ nhiệt cho truyện.",
    ctaLabel: "Viết tiếp",
    ctaHref: "/creator/stories",
    placements: ["creator"],
    cooldownHours: 12,
    dismissCooldownHours: 48
  },
  {
    key: "author_has_comments_unreplied",
    segment: "author_has_comments_unreplied",
    title: "Bạn có bình luận mới từ độc giả",
    description: "Trả lời nhanh để tăng gắn kết với fan của bạn.",
    ctaLabel: "Trả lời ngay",
    ctaHref: "/community",
    placements: ["creator"],
    cooldownHours: 8,
    dismissCooldownHours: 24
  }
];

const nudgeByKey = new Map<LifecycleNudgeKey, LifecycleNudgeConfig>(
  lifecycleNudges.map((item) => [item.key, item])
);

export function getLifecycleNudgeByKey(key: LifecycleNudgeKey) {
  return nudgeByKey.get(key) ?? null;
}

export function getNudgesForPlacement(placement: LifecycleNudgePlacement) {
  return lifecycleNudges.filter((nudge) => nudge.placements.includes(placement));
}

export function getHighestPrioritySegment(segments: LifecycleSegment[]) {
  const priority: LifecycleSegment[] = [
    "author_has_comments_unreplied",
    "author_has_story_no_recent_update",
    "author_no_story",
    "author_first_story_no_chapter",
    "reader_no_comment",
    "reels_viewer_no_follow",
    "new_user_no_action",
    "dormant_reader_7d",
    "dormant_reader_3d",
    "active_author",
    "active_reader",
    "author_milestone_ready",
    "early_fan_user",
    "top_fan_user"
  ];

  for (const segment of priority) {
    if (segments.includes(segment)) {
      return segment;
    }
  }

  return null;
}
