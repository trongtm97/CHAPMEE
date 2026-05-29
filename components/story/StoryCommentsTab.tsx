"use client";

import Link from "next/link";
import { useState } from "react";
import { CommentForm } from "@/components/comments/CommentForm";
import { CommentItem } from "@/components/comments/CommentItem";
import { ReaderSheet } from "@/components/reader/ReaderSheet";
import type { CommentView } from "@/lib/comments/getComments";

type StoryCommentsTabProps = {
  comments: CommentView[];
  currentUserId: string | null;
  returnTo: string;
  storyId: string;
};

export function StoryCommentsTab({
  comments,
  currentUserId,
  returnTo,
  storyId
}: StoryCommentsTabProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const preview = comments.slice(0, 3);

  return (
    <div className="space-y-3">
      <button
        className="tap-highlight w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left text-sm text-zinc-500"
        onClick={() => setSheetOpen(true)}
        type="button"
      >
        Viết cảm nhận...
      </button>
      {preview.length > 0 ? (
        <div className="space-y-2">
          {preview.map((comment) => (
            <CommentItem comment={comment} key={comment.id} returnTo={returnTo} />
          ))}
        </div>
      ) : (
        <p className="text-sm leading-6 text-zinc-500">
          Chưa có bình luận. Hãy là người đầu tiên chia sẻ cảm nhận.
        </p>
      )}
      {comments.length > preview.length ? (
        <button
          className="text-sm font-semibold text-cyan-200"
          onClick={() => setSheetOpen(true)}
          type="button"
        >
          Xem tất cả bình luận ({comments.length})
        </button>
      ) : null}
      <ReaderSheet onClose={() => setSheetOpen(false)} open={sheetOpen} title="Bình luận truyện">
        {currentUserId ? (
          <CommentForm returnTo={returnTo} storyId={storyId} />
        ) : (
          <div className="mb-4 space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-sm text-zinc-300">Đăng nhập để bình luận.</p>
            <Link
              className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-cyan-300 px-4 text-sm font-bold text-zinc-950"
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
              <CommentItem comment={comment} key={comment.id} returnTo={returnTo} />
            ))
          )}
        </div>
      </ReaderSheet>
    </div>
  );
}
