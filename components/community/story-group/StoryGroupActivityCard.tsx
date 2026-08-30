"use client";

import Link from "next/link";
import { ActivitySpoilerExcerpt } from "@/components/community/story-group/ActivitySpoilerExcerpt";
import { getSourceTypeLabel } from "@/lib/community-sync/activity-feed-labels";
import type { EnrichedGroupFeedItemView } from "@/lib/community-sync/enrich-group-feed-items";

type StoryGroupActivityCardProps = {
  item: EnrichedGroupFeedItemView;
  readerChapterNumber: number | null;
};

function formatRelativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "Vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return `${days} ngày trước`;
}

export function StoryGroupActivityCard({
  item,
  readerChapterNumber
}: StoryGroupActivityCardProps) {
  const isAggregated = item.itemType === "aggregated_comments";
  const isReview = item.itemType === "review";
  const href = item.targetUrl ?? undefined;
  const sourceBadge = isAggregated
    ? "Gom hoạt động"
    : getSourceTypeLabel(
        item.sourceEntityType === "comment" && !isReview
          ? "chapter"
          : item.sourceEntityType
      );

  const body = (
    <article className="space-y-2.5 rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-cyan-300/25">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-cyan-300/10 px-2.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-cyan-100">
          {sourceBadge}
        </span>
        <span className="text-[0.68rem] font-semibold text-zinc-500">{item.sourceLabel}</span>
        <span className="ml-auto text-[0.68rem] text-zinc-500">
          {formatRelativeTime(item.createdAt)}
        </span>
      </div>

      {isAggregated ? (
        <p className="text-sm font-semibold leading-6 text-white">
          {item.displayTitle ?? item.excerpt}
        </p>
      ) : (
        <>
          <p className="text-sm font-bold text-zinc-100">
            {isReview
              ? item.actorName
              : item.isAuthorReply
                ? "Tác giả trả lời"
                : item.actorName}
            {item.isAuthorReply && !isReview ? (
              <span className="ml-2 rounded-full bg-violet-400/15 px-2 py-0.5 text-[0.62rem] font-black uppercase text-violet-200">
                Tác giả
              </span>
            ) : null}
          </p>
          <ActivitySpoilerExcerpt
            excerpt={item.excerpt}
            readerChapterNumber={readerChapterNumber}
            sourceChapterOrder={item.sourceChapterOrder}
            spoilerLevel={item.spoilerLevel}
            targetUrl={item.targetUrl}
          />
        </>
      )}

      {href ? (
        <p className="text-xs font-bold text-cyan-300">
          {isAggregated ? "Đi tới nguồn →" : isReview ? "Xem review →" : "Xem bình luận / Đi tới nguồn →"}
        </p>
      ) : null}
    </article>
  );

  if (!href) {
    return body;
  }

  return (
    <Link className="block tap-highlight" href={`${href}${item.sourceCommentId ? "#comments" : ""}`}>
      {body}
    </Link>
  );
}
