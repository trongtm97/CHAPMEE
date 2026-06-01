"use client";

import { AvatarFallback } from "@/components/ui/AvatarFallback";
import { StudioRowActionMenu } from "@/components/studio/StudioRowActionMenu";
import { CommentStatusBadge } from "@/components/studio/comments/CommentStatusBadge";
import { formatRelativeTime } from "@/lib/notifications/format-relative-time";
import type { StudioCommentInboxItem } from "@/types/comments";
import type { ReactNode } from "react";

type CommentCardProps = {
  compact?: boolean;
  item: StudioCommentInboxItem;
  menu?: ReactNode;
  selected?: boolean;
  selection?: {
    checked: boolean;
    onChange: (checked: boolean) => void;
  };
};

export function CommentCard({
  compact = false,
  item,
  menu,
  selected = false,
  selection
}: CommentCardProps) {
  const menuNode = menu ?? null;

  return (
    <div className="flex gap-2.5">
      {selection ? (
        <input
          aria-label={`Chọn bình luận của ${item.authorDisplayName ?? "độc giả"}`}
          checked={selection.checked}
          className="mt-3 h-4 w-4 shrink-0 rounded border-white/20 bg-zinc-900 text-cyan-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"
          onChange={(event) => selection.onChange(event.target.checked)}
          onClick={(event) => event.stopPropagation()}
          type="checkbox"
        />
      ) : null}

      <AvatarFallback
        name={item.authorDisplayName ?? "Độc giả"}
        size="sm"
        src={item.authorAvatarUrl}
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-zinc-100">
              {item.authorDisplayName}
            </p>
            <p className="mt-0.5 truncate text-xs text-zinc-500">
              {item.source === "community_post" ? (
                <span className="text-violet-300">Cộng đồng · </span>
              ) : null}
              {item.contextLabel}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <CommentStatusBadge item={item} />
            {menuNode}
          </div>
        </div>

        <p
          className={`mt-1.5 text-sm leading-snug text-zinc-200 ${compact ? "line-clamp-2" : ""} ${selected ? "text-zinc-100" : ""}`}
        >
          {item.content}
        </p>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-zinc-500">
          <span>{formatRelativeTime(item.createdAt)}</span>
          {item.likeCount > 0 ? <span>{item.likeCount} thích</span> : null}
          {item.replyCount > 0 ? <span>{item.replyCount} phản hồi</span> : null}
        </div>
      </div>
    </div>
  );
}
