import type {
  ProfileAchievement,
  ProfileBadge,
  ProfileBadgeTone,
  ProfileStat
} from "@/types/profile";

export function formatCompactCount(value: number) {
  if (!Number.isFinite(value)) {
    return "0";
  }

  const normalized = Math.max(0, value);

  if (normalized < 1000) {
    return `${normalized}`;
  }

  if (normalized < 1_000_000) {
    const compact = normalized / 1000;
    return `${compact >= 100 ? Math.round(compact) : Number(compact.toFixed(1)).toString()}K`;
  }

  const compact = normalized / 1_000_000;
  return `${compact >= 100 ? Math.round(compact) : Number(compact.toFixed(1)).toString()}M`;
}

function daysSince(dateValue: string | null | undefined) {
  if (!dateValue) {
    return Number.POSITIVE_INFINITY;
  }

  const value = new Date(dateValue).getTime();
  if (Number.isNaN(value)) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.floor((Date.now() - value) / (24 * 60 * 60 * 1000));
}

function toneForThreshold(
  achieved: boolean,
  fallback: ProfileBadgeTone = "default"
): ProfileBadgeTone {
  return achieved ? "success" : fallback;
}

export function buildReaderBadges(input: {
  profileRole?: string | null;
  createdAt?: string | null;
  savedStoriesCount: number;
  followingAuthorsCount: number;
}): ProfileBadge[] {
  const badges: ProfileBadge[] = [
    { label: "Người đọc", tone: "default" }
  ];

  if (input.profileRole && input.profileRole !== "user") {
    const roleLabel =
      input.profileRole === "creator" ? "Tác giả" : input.profileRole;
    badges.push({
      label: roleLabel,
      tone: "warning"
    });
  }

  if (daysSince(input.createdAt) <= 7) {
    badges.push({ label: "Người đọc mới", tone: "success" });
  }

  if (input.savedStoriesCount > 0) {
    badges.push({
      label: `${formatCompactCount(input.savedStoriesCount)} đã lưu`,
      tone: "success"
    });
  }

  if (input.followingAuthorsCount > 0) {
    badges.push({
      label: `${formatCompactCount(input.followingAuthorsCount)} follow`,
      tone: "default"
    });
  }

  return badges.slice(0, 4);
}

export function buildReaderAchievements(input: {
  createdAt?: string | null;
  savedStoriesCount: number;
  followingAuthorsCount: number;
  commentCount: number;
  commentLikeCount: number;
}): ProfileAchievement[] {
  return [
    {
      id: "new-reader",
      title: "Người đọc mới",
      description: "Tài khoản mới mở, đang làm quen với ChapMee.",
      status: daysSince(input.createdAt) <= 7 ? "unlocked" : "locked",
      value: daysSince(input.createdAt) <= 7 ? "Mở khóa" : undefined,
      tone: "success"
    },
    {
      id: "saved-stories",
      title: "Đã lưu truyện",
      description: "Những truyện bạn lưu lại để đọc sau.",
      status: input.savedStoriesCount > 0 ? "unlocked" : "locked",
      value:
        input.savedStoriesCount > 0
          ? `${formatCompactCount(input.savedStoriesCount)} truyện`
          : undefined,
      tone: toneForThreshold(input.savedStoriesCount > 0, "warning")
    },
    {
      id: "followed-authors",
      title: "Đã follow tác giả",
      description: "Theo dõi những người viết mà bạn thích.",
      status: input.followingAuthorsCount > 0 ? "unlocked" : "locked",
      value:
        input.followingAuthorsCount > 0
          ? `${formatCompactCount(input.followingAuthorsCount)} tác giả`
          : undefined,
      tone: toneForThreshold(input.followingAuthorsCount > 0, "default")
    },
    {
      id: "liked-comments",
      title: "Comment được thích",
      description: "Bình luận của bạn đã nhận phản hồi tích cực.",
      status: input.commentLikeCount > 0 ? "unlocked" : "locked",
      value:
        input.commentLikeCount > 0
          ? `${formatCompactCount(input.commentLikeCount)} lượt thích`
          : undefined,
      tone: toneForThreshold(input.commentLikeCount > 0, "success")
    },
    {
      id: "seven-day-streak",
      title: "Đọc 7 ngày liên tiếp",
      description: "Chuẩn bị hiển thị khi có dữ liệu streak.",
      status: "unavailable",
      tone: "default"
    },
    {
      id: "early-fan",
      title: "Fan đời đầu",
      description: "Chuẩn bị hiển thị khi có dữ liệu fan sớm.",
      status: "unavailable",
      tone: "default"
    }
  ];
}

export function buildReaderStats(input: {
  savedStoriesCount: number;
  followingAuthorsCount: number;
  commentCount: number;
  currentReadingCount: number;
}): ProfileStat[] {
  return [
    {
      label: "Đang đọc",
      value: formatCompactCount(input.currentReadingCount)
    },
    {
      label: "Đã lưu",
      value: formatCompactCount(input.savedStoriesCount)
    },
    {
      label: "Theo dõi",
      value: formatCompactCount(input.followingAuthorsCount)
    },
    {
      label: "Bình luận",
      value: formatCompactCount(input.commentCount)
    }
  ];
}

export function buildAuthorBadges(input: {
  createdAt?: string | null;
  followerCount: number;
  storiesCount: number;
  totalReads: number;
}): ProfileBadge[] {
  const badges: ProfileBadge[] = [{ label: "Tác giả", tone: "default" }];

  if (daysSince(input.createdAt) <= 14) {
    badges.push({ label: "Tác giả mới", tone: "success" });
  }

  if (input.storiesCount > 0) {
    badges.push({
      label: `${formatCompactCount(input.storiesCount)} truyện`,
      tone: "default"
    });
  }

  if (input.followerCount >= 100) {
    badges.push({ label: "100 follower", tone: "success" });
  }

  if (input.totalReads >= 1_000) {
    badges.push({ label: "1k lượt đọc", tone: "success" });
  }

  return badges.slice(0, 4);
}

export function buildAuthorAchievements(input: {
  createdAt?: string | null;
  followerCount: number;
  storiesCount: number;
  totalReads: number;
}): ProfileAchievement[] {
  return [
    {
      id: "new-author",
      title: "Tác giả mới",
      description: "Vừa mở trang tác giả trên ChapMee.",
      status: daysSince(input.createdAt) <= 14 ? "unlocked" : "locked",
      value: daysSince(input.createdAt) <= 14 ? "Mới" : undefined,
      tone: "success"
    },
    {
      id: "first-story",
      title: "Có truyện đầu tiên",
      description: "Đã có ít nhất một truyện public.",
      status: input.storiesCount > 0 ? "unlocked" : "locked",
      value:
        input.storiesCount > 0
          ? `${formatCompactCount(input.storiesCount)} truyện`
          : undefined,
      tone: toneForThreshold(input.storiesCount > 0, "default")
    },
    {
      id: "read-100",
      title: "Đạt 100 lượt đọc",
      description: "Mốc tăng trưởng đầu tiên của tác giả.",
      status: input.totalReads >= 100 ? "unlocked" : "locked",
      value:
        input.totalReads > 0
          ? `${formatCompactCount(input.totalReads)} lượt`
          : undefined,
      tone: toneForThreshold(input.totalReads >= 100, "warning")
    },
    {
      id: "read-1000",
      title: "Đạt 1.000 lượt đọc",
      description: "Tác phẩm bắt đầu chạm mốc lớn hơn.",
      status: input.totalReads >= 1000 ? "unlocked" : "locked",
      value:
        input.totalReads > 0
          ? `${formatCompactCount(input.totalReads)} lượt`
          : undefined,
      tone: toneForThreshold(input.totalReads >= 1000, "success")
    },
    {
      id: "followers-100",
      title: "Có 100 follower",
      description: "Cộng đồng bắt đầu theo dõi bạn đều hơn.",
      status: input.followerCount >= 100 ? "unlocked" : "locked",
      value:
        input.followerCount > 0
          ? `${formatCompactCount(input.followerCount)} follower`
          : undefined,
      tone: toneForThreshold(input.followerCount >= 100, "success")
    },
    {
      id: "trending",
      title: "Truyện đang tăng",
      description: "Chuẩn bị hiển thị khi có tín hiệu tăng trưởng.",
      status: "unavailable",
      tone: "default"
    }
  ];
}

export function buildAuthorStats(input: {
  followerCount: number;
  totalReads: number;
  totalLikes: number;
  storiesCount: number;
}): ProfileStat[] {
  return [
    {
      label: "Follower",
      value: formatCompactCount(input.followerCount)
    },
    {
      label: "Lượt đọc",
      value: formatCompactCount(input.totalReads)
    },
    {
      label: "Lượt thích",
      value: formatCompactCount(input.totalLikes)
    },
    {
      label: "Truyện",
      value: formatCompactCount(input.storiesCount)
    }
  ];
}
