"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ReelsCommentInput } from "@/components/reels/ReelsCommentInput";
import { ReelsCommentItem, type ReelsCommentView } from "@/components/reels/ReelsCommentItem";
import { trackFeedComment, type ReelsAnalyticsContext } from "@/lib/analytics/trackReelsEvents";

type ReelsCommentSheetProps = {
  context: ReelsAnalyticsContext | null;
  onClose: () => void;
  onCommentCreated: () => void;
  open: boolean;
};

type CommentSheetResponse = {
  comments: ReelsCommentView[];
  currentUserId: string | null;
  error: string | null;
  loginUrl: string | null;
};

const initialResponse: CommentSheetResponse = {
  comments: [],
  currentUserId: null,
  error: null,
  loginUrl: null
};

function CloseIcon() {
  return (
    <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24">
      <path
        d="m6 6 12 12M18 6 6 18"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function ReelsCommentSheet({
  context,
  onClose,
  onCommentCreated,
  open
}: ReelsCommentSheetProps) {
  const [data, setData] = useState<CommentSheetResponse>(initialResponse);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  const totalCommentCount = useMemo(
    () =>
      data.comments.reduce(
        (count, comment) => count + 1 + comment.replies.length,
        0
      ),
    [data.comments]
  );

  const loadComments = useCallback(async () => {
    if (!context) {
      return;
    }

    setLoading(true);

    try {
      const query = new URLSearchParams({
        storyId: context.item.storyId,
        episodeId: context.item.id
      });
      const response = await fetch(`/api/reels/comments?${query.toString()}`, {
        cache: "no-store"
      });
      const payload = (await response.json()) as CommentSheetResponse;
      setData(payload);
    } finally {
      setLoading(false);
    }
  }, [context]);

  useEffect(() => {
    if (!open || !context) {
      return;
    }

    trackFeedComment(context);
    const frame = window.requestAnimationFrame(() => {
      void loadComments();
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [open, context, loadComments]);

  async function submitComment(content: string, parentId?: string) {
    if (!context) {
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/reels/comments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          content,
          episodeId: context.item.id,
          parentId: parentId ?? null,
          storyId: context.item.storyId
        })
      });

      const payload = (await response.json()) as
        | { loginUrl?: string; error?: string }
        | undefined;

      if (response.status === 401 && payload?.loginUrl) {
        window.location.href = payload.loginUrl;
        return;
      }

      if (!response.ok) {
        setData((previous) => ({
          ...previous,
          error: payload?.error ?? "Không thể gửi bình luận."
        }));
        return;
      }

      setReplyingTo(null);
      onCommentCreated();
      await loadComments();
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleCommentLike(commentId: string) {
    const response = await fetch(`/api/reels/comments/${commentId}/like`, {
      method: "POST"
    });
    const payload = (await response.json()) as { loginUrl?: string } | undefined;

    if (response.status === 401 && payload?.loginUrl) {
      window.location.href = payload.loginUrl;
      return;
    }

    await loadComments();
  }

  async function togglePin(commentId: string, pinned: boolean) {
    const response = await fetch(`/api/reels/comments/${commentId}/pin`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ pinned })
    });

    if (response.ok) {
      await loadComments();
    }
  }

  if (!open || !context) {
    return null;
  }

  return (
    <div className="absolute inset-0 z-40 flex items-end bg-black/55 backdrop-blur-[6px]">
      <button
        aria-label="Đóng bình luận"
        className="absolute inset-0"
        onClick={onClose}
        type="button"
      />

      <section className="relative z-10 flex h-[82dvh] w-full flex-col overflow-hidden rounded-t-[1.9rem] bg-white text-[#111827] shadow-[0_-24px_60px_rgba(0,0,0,0.34)]">
        <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-[#d1d5db]" />

        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-[#e5e7eb] bg-white px-4 pb-3 pt-4 sm:px-5">
          <div className="w-10" />
          <div className="text-center">
            <h2 className="text-[1rem] font-bold">Bình luận</h2>
            <p className="text-[0.8rem] text-[#6b7280]">{totalCommentCount}</p>
          </div>
          <button
            className="tap-highlight inline-flex h-10 w-10 items-center justify-center rounded-full text-[#6b7280] transition hover:bg-[#f3f4f6] hover:text-[#111827]"
            onClick={onClose}
            type="button"
          >
            <CloseIcon />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-4 sm:px-5">
          {loading ? (
            <div className="py-10 text-center text-sm text-[#6b7280]">
              Đang tải bình luận...
            </div>
          ) : data.comments.length === 0 ? (
            <div className="py-10 text-center text-sm text-[#6b7280]">
              Chưa có bình luận nào. Mở hàng cho chap này nhé.
            </div>
          ) : (
            <div className="space-y-4">
              {data.comments.map((comment) => (
                <ReelsCommentItem
                  activeReplyId={replyingTo}
                  comment={comment}
                  isSubmitting={submitting}
                  key={comment.id}
                  onLike={toggleCommentLike}
                  onPin={togglePin}
                  onReply={(commentId) =>
                    setReplyingTo((current) => (current === commentId ? null : commentId))
                  }
                  onSubmitReply={(parentId, content) => void submitComment(content, parentId)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 z-10 border-t border-[#e5e7eb] bg-white px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 sm:px-5">
          <ReelsCommentInput
            disabled={submitting}
            onSubmit={(content) => void submitComment(content)}
            placeholder={
              data.currentUserId
                ? "Thêm bình luận..."
                : "Đăng nhập để bình luận..."
            }
          />
          {data.error ? (
            <p className="mt-2 text-sm text-[#dc2626]">{data.error}</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
