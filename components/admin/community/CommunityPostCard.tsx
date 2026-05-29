"use client";

import { Badge, Button } from "@/components/ui";
import {
  COMMUNITY_POST_STATUS_LABELS,
  COMMUNITY_POST_TYPE_LABELS
} from "@/lib/admin/community-admin-labels";
import { reasonCodeLabel } from "@/lib/community/auto-moderation-labels";
import type { CommunityAdminPermissions, CommunityQueueItem } from "@/types/community-admin";

type CommunityPostCardProps = {
  post: CommunityQueueItem;
  permissions: CommunityAdminPermissions;
  onView: () => void;
  onApprove: () => void;
  onReject: () => void;
  onHide: () => void;
  onPin: () => void;
  onFeature: () => void;
  disabled?: boolean;
};

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return "Vừa xong";
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return `${days} ngày trước`;
}

function roleLabel(role: CommunityQueueItem["authorRole"]) {
  if (role === "studio") return "Tác giả";
  if (role === "admin") return "Admin";
  return "Độc giả";
}

export function CommunityPostCard({
  post,
  permissions,
  onView,
  onApprove,
  onReject,
  onHide,
  onPin,
  onFeature,
  disabled
}: CommunityPostCardProps) {
  const linked =
    post.storyTitle != null
      ? `gắn với ${post.storyTitle}`
      : post.studioName != null
        ? `gắn với ${post.studioName}`
        : "không gắn truyện";

  const authorLine = [
    post.authorUsername ?? post.authorName ?? "ẩn danh",
    linked,
    relativeTime(post.createdAt)
  ].join(" · ");

  return (
    <article className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <Badge>{COMMUNITY_POST_TYPE_LABELS[post.type]}</Badge>
          <h3 className="truncate text-base font-semibold text-white">{post.title}</h3>
        </div>
        <Badge variant={post.status === "pending" ? "warning" : "default"}>
          {COMMUNITY_POST_STATUS_LABELS[post.status]}
        </Badge>
      </div>

      <p className="mt-2 text-sm text-zinc-400">
        {authorLine}
        {post.authorRole ? ` · ${roleLabel(post.authorRole)}` : ""}
      </p>

      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-zinc-500">
        {post.excerpt}
      </p>

      <p className="mt-2 text-xs text-zinc-500">
        {post.reportCount} report · {post.commentCount} bình luận
        {post.isPinned ? " · Đã ghim" : ""}
        {post.isFeatured ? " · Nổi bật" : ""}
        {post.commentsLocked ? " · Khóa BL" : ""}
      </p>

      {post.autoDecisionLabel || post.trustScore != null ? (
        <p className="mt-2 text-xs text-cyan-400/90">
          {post.autoDecisionLabel ? `Auto: ${post.autoDecisionLabel}` : ""}
          {post.trustScore != null ? ` · Trust ${post.trustScore}` : ""}
        </p>
      ) : null}

      {post.autoReasonCodes.length > 0 ? (
        <p className="mt-1 text-xs text-zinc-600">
          {post.autoReasonCodes.slice(0, 3).map(reasonCodeLabel).join(" · ")}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button disabled={disabled} onClick={onView} type="button" variant="secondary">
          Xem
        </Button>
        {permissions.canModeratePosts && post.status === "pending" ? (
          <>
            <Button disabled={disabled} onClick={onApprove} type="button" variant="primary">
              Duyệt
            </Button>
            <Button disabled={disabled} onClick={onReject} type="button" variant="danger">
              Từ chối
            </Button>
          </>
        ) : null}
        {permissions.canModeratePosts && post.status === "approved" ? (
          <Button disabled={disabled} onClick={onHide} type="button" variant="ghost">
            Ẩn
          </Button>
        ) : null}
        {permissions.canModeratePosts ? (
          <>
            <Button disabled={disabled} onClick={onPin} type="button" variant="ghost">
              {post.isPinned ? "Bỏ ghim" : "Ghim"}
            </Button>
            <Button disabled={disabled} onClick={onFeature} type="button" variant="ghost">
              {post.isFeatured ? "Bỏ nổi bật" : "Nổi bật"}
            </Button>
          </>
        ) : null}
      </div>
    </article>
  );
}
