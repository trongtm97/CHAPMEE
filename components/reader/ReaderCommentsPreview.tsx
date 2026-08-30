"use client";

import Link from "next/link";
import { useState } from "react";
import { CommentForm } from "@/components/comments/CommentForm";
import { CommunityGroupLink } from "@/components/community/CommunityGroupLink";
import { ReaderSheet } from "@/components/reader/ReaderSheet";
import {
  readerSectionDivider,
  readerSectionTitle
} from "@/components/reader/reader-section-styles";
import type { CommentView } from "@/lib/comments/getComments";

type ReaderCommentsPreviewProps = {
  comments: CommentView[];
  currentUserId: string | null;
  returnTo: string;
  storyId: string;
  storySlug: string;
  episodeId: string;
  totalCount?: number;
};

function formatCommentDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit"
  }).format(new Date(value));
}

export function ReaderCommentsPreview({
  comments,
  currentUserId,
  episodeId,
  returnTo,
  storyId,
  storySlug,
  totalCount
}: ReaderCommentsPreviewProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const preview = comments.slice(0, 2);
  const hasMore = (totalCount ?? comments.length) > preview.length;

  return (
    <section className={`${readerSectionDivider} lg:hidden`} id="comments">
      <div className="flex items-center justify-between gap-2">
        <h3 className={readerSectionTitle}>Bình luận</h3>
        <CommunityGroupLink
          className="text-xs font-semibold text-cyan-300"
          label="Group truyện"
          storySlug={storySlug}
        />
      </div>
      <button
        className="tap-highlight mt-3 flex min-h-10 w-full items-center rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 text-left text-sm text-zinc-500"
        onClick={() => setSheetOpen(true)}
        type="button"
      >
        Viết cảm nhận của bạn...
      </button>
      {preview.length > 0 ? (
        <ul className="mt-2.5 space-y-2">
          {preview.map((comment) => (
            <li key={comment.id}>
              <button
                className="tap-highlight w-full rounded-lg bg-white/[0.02] px-3 py-2 text-left"
                onClick={() => setSheetOpen(true)}
                type="button"
              >
                <p className="truncate text-xs font-medium text-zinc-400">
                  {comment.displayName ?? "Độc giả"} · {formatCommentDate(comment.createdAt)}
                </p>
                <p className="mt-0.5 line-clamp-2 text-sm leading-5 text-zinc-300">
                  {comment.content}
                </p>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2.5 text-xs leading-5 text-zinc-500">
          Chưa có bình luận. Hãy là người đầu tiên chia sẻ cảm nhận.
        </p>
      )}
      {hasMore ? (
        <button
          className="mt-2 text-xs font-semibold text-cyan-200/90"
          onClick={() => setSheetOpen(true)}
          type="button"
        >
          Xem tất cả bình luận ({totalCount ?? comments.length})
        </button>
      ) : null}
      <ReaderSheet onClose={() => setSheetOpen(false)} open={sheetOpen} title="Bình luận">
        {currentUserId ? (
          <CommentForm episodeId={episodeId} returnTo={returnTo} storyId={storyId} />
        ) : (
          <div className="mb-4 space-y-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
            <p className="text-sm text-zinc-400">Đăng nhập để tham gia bình luận.</p>
            <Link
              className="inline-flex min-h-10 w-full items-center justify-center rounded-full bg-cyan-300 px-4 text-sm font-bold text-zinc-950"
              href={`/login?next=${encodeURIComponent(returnTo)}`}
            >
              Đăng nhập
            </Link>
          </div>
        )}
        <div className="space-y-3">
          {comments.length === 0 ? (
            <p className="text-sm text-zinc-500">Chưa có bình luận.</p>
          ) : (
            comments.map((comment) => (
              <div
                className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-3"
                key={comment.id}
              >
                <p className="truncate text-xs font-medium text-zinc-400">
                  {comment.displayName ?? "Độc giả"} · {formatCommentDate(comment.createdAt)}
                </p>
                <p className="mt-1 text-sm leading-6 text-zinc-300">{comment.content}</p>
              </div>
            ))
          )}
        </div>
      </ReaderSheet>
    </section>
  );
}
