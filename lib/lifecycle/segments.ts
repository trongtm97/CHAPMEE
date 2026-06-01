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
    title: "Thay truyen cuon? Follow de khong mat dau",
    description: "Luu hoac follow truyen de nhan chap moi nhanh hon.",
    ctaLabel: "Kham pha truyen hot",
    ctaHref: "/discover",
    placements: ["reels", "me"],
    cooldownHours: 24,
    dismissCooldownHours: 72
  },
  {
    key: "reader_no_comment",
    segment: "reader_no_comment",
    title: "Ban nghi nhan vat nen lam gi tiep?",
    description: "Vote hoac binh luan nhe de tac gia biet y kien cua ban.",
    ctaLabel: "Vote hoac binh luan",
    ctaHref: "/community",
    placements: ["reels", "me"],
    cooldownHours: 24,
    dismissCooldownHours: 72
  },
  {
    key: "author_no_story",
    segment: "author_no_story",
    title: "Dang truyen dau tien cua ban",
    description: "Mot story ngan la du de mo profile tac gia.",
    ctaLabel: "Tao truyen",
    ctaHref: "/creator/stories/new",
    placements: ["creator", "me"],
    cooldownHours: 12,
    dismissCooldownHours: 48
  },
  {
    key: "author_has_story_no_recent_update",
    segment: "author_has_story_no_recent_update",
    title: "Doc gia dang cho chap moi",
    description: "Cap nhat mot chap ngan de giu nhiet cho truyen.",
    ctaLabel: "Viet tiep",
    ctaHref: "/creator/stories",
    placements: ["creator"],
    cooldownHours: 12,
    dismissCooldownHours: 48
  },
  {
    key: "author_has_comments_unreplied",
    segment: "author_has_comments_unreplied",
    title: "Ban co binh luan moi tu doc gia",
    description: "Tra loi nhanh de tang gan ket voi fan cua ban.",
    ctaLabel: "Tra loi ngay",
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
