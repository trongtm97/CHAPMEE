import type { CommunityFeedItem } from "@/types/community";

export const kindLabel: Record<CommunityFeedItem["kind"], string> = {
  user_post: "Thảo luận",
  story_group_post: "Thảo luận",
  author_group_post: "Tác giả",
  story_comment_highlight: "Bình luận hot",
  author_reply: "Tác giả trả lời",
  review: "Review",
  poll: "Bình chọn",
  challenge: "Thử thách",
  chapter_discussion: "Chương mới"
};

export const roleLabel = {
  creator: "Tác giả",
  reader: "Độc giả",
  mod: "Mod"
} as const;

export function formatRelativeTime(value: string) {
  const diffMs = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(diffMs / 60000);

  if (minutes < 1) {
    return "Vừa xong";
  }

  if (minutes < 60) {
    return `${minutes} phút`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours} giờ`;
  }

  return `${Math.floor(hours / 24)} ngày`;
}

export function threadHref(item: CommunityFeedItem) {
  return `/community/${item.threadPostId}`;
}

export function storyGroupHref(item: CommunityFeedItem) {
  if (item.storySlug) {
    return `/community/story/${item.storySlug}`;
  }

  if (item.storyId) {
    return `/community/story/${item.storyId}`;
  }

  return "/community/groups";
}

export function buildContextLine(item: CommunityFeedItem): string | null {
  if (item.kind === "author_reply" && item.authorChipName && item.storyTitle) {
    return `${item.authorChipName} · ${item.storyTitle}`;
  }

  if (item.storyTitle && item.chapterLabel) {
    return `${item.storyTitle} · ${item.chapterLabel}`;
  }

  if (item.storyTitle) {
    return item.groupType === "story"
      ? `Nhóm truyện: ${item.storyTitle}`
      : item.storyTitle;
  }

  if (item.authorChipName) {
    return `Tác giả ${item.authorChipName}`;
  }

  return null;
}

export function headerMetaLine(item: CommunityFeedItem) {
  const role =
    item.authorRole === "creator"
      ? roleLabel.creator
      : item.authorRole === "mod"
        ? roleLabel.mod
        : roleLabel.reader;

  return `${item.authorName} · ${role} · ${formatRelativeTime(item.createdAt)}`;
}

export function shouldShowSecondaryComment(item: CommunityFeedItem) {
  if (!item.featuredCommentPreview) {
    return false;
  }

  if (
    item.kind === "story_comment_highlight" ||
    item.kind === "author_reply"
  ) {
    return false;
  }

  const preview = item.featuredCommentPreview.trim();
  const body = item.body.trim();

  if (preview === body || preview === item.title?.trim()) {
    return false;
  }

  return (
    item.authorRole === "creator" ||
    item.commentCount >= 5 ||
    item.voteCount >= 40
  );
}

export function primaryBody(item: CommunityFeedItem) {
  if (item.kind === "story_comment_highlight") {
    return item.body;
  }

  if (item.kind === "author_reply") {
    return item.body;
  }

  return item.body;
}

export function showTitle(item: CommunityFeedItem) {
  if (
    item.kind === "story_comment_highlight" ||
    item.kind === "author_reply" ||
    item.kind === "poll"
  ) {
    return false;
  }

  return Boolean(item.title);
}

export function ctaForItem(item: CommunityFeedItem) {
  switch (item.kind) {
    case "story_comment_highlight":
      return { label: "Xem thảo luận →", href: threadHref(item) };
    case "author_reply":
      return { label: "Xem trả lời →", href: threadHref(item) };
    case "challenge":
      return { label: "Viết bài dự thi →", href: "/community/new?type=challenge" };
    case "story_group_post":
    case "chapter_discussion":
      return { label: "Vào nhóm →", href: storyGroupHref(item) };
    case "poll":
      return { label: "Bình chọn →", href: threadHref(item) };
    default:
      return { label: "Xem thảo luận →", href: threadHref(item) };
  }
}
