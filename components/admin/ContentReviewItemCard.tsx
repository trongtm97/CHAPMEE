"use client";

import { Badge, Button } from "@/components/ui";
import {
  CONTENT_REVIEW_STATUS_LABELS,
  CONTENT_REVIEW_TYPE_LABELS
} from "@/lib/admin/content-review-reasons";
import type { ContentReviewQueueItem } from "@/types/admin-content-review";

type ContentReviewItemCardProps = {
  item: ContentReviewQueueItem;
  onView: () => void;
  onApprove: () => void;
  onRequestChanges: () => void;
  onReject: () => void;
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

export function ContentReviewItemCard({
  item,
  onView,
  onApprove,
  onRequestChanges,
  onReject,
  disabled
}: ContentReviewItemCardProps) {
  const isPending =
    item.status === "pending" || item.status === "changes_requested";

  return (
    <article
      className={`rounded-xl border p-4 transition ${
        isPending ? "border-white/10 bg-zinc-900/50" : "border-white/5 bg-zinc-900/20 opacity-80"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <Badge variant="default">{CONTENT_REVIEW_TYPE_LABELS[item.type]}</Badge>
          <h3 className="truncate text-base font-semibold text-white">{item.title}</h3>
        </div>
        <Badge variant={isPending ? "warning" : "default"}>
          {CONTENT_REVIEW_STATUS_LABELS[item.status] ?? item.status}
        </Badge>
      </div>

      <p className="mt-2 text-sm text-zinc-400">
        Tác giả: {item.creatorName ?? "—"}
        {item.creatorUsername ? ` · @${item.creatorUsername}` : ""}
        {item.genreName ? ` · ${item.genreName}` : ""}
        {item.parentTitle ? ` · Truyện: ${item.parentTitle}` : ""}
        {item.episodeNumber != null ? ` · Chap ${item.episodeNumber}` : ""}
        {item.hasMonetization ? " · Có kiếm tiền" : ""}
        {" · Gửi "}
        {relativeTime(item.createdAt)}
      </p>

      {item.excerpt ? (
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-zinc-500">
          {item.excerpt}
        </p>
      ) : null}

      {item.riskFlags.length > 0 ? (
        <p className="mt-2 text-xs text-amber-400">{item.riskFlags.join(" · ")}</p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button disabled={disabled} onClick={onView} type="button" variant="secondary">
          Xem chi tiết
        </Button>
        {isPending ? (
          <>
            <Button disabled={disabled} onClick={onApprove} type="button">
              Duyệt
            </Button>
            <Button
              disabled={disabled}
              onClick={onRequestChanges}
              type="button"
              variant="secondary"
            >
              Yêu cầu sửa
            </Button>
            <Button disabled={disabled} onClick={onReject} type="button" variant="danger">
              Từ chối
            </Button>
          </>
        ) : null}
      </div>
    </article>
  );
}
