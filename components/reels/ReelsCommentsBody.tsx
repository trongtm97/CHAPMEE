"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ReelsCommentInput } from "@/components/reels/ReelsCommentInput";
import { ReelsCommentItem, type ReelsCommentView } from "@/components/reels/ReelsCommentItem";
import { trackFeedComment, type ReelsAnalyticsContext } from "@/lib/analytics/trackReelsEvents";

type CommentResponse = {
  comments: ReelsCommentView[];
  currentUserId: string | null;
  error: string | null;
  loginUrl: string | null;
};

const initialResponse: CommentResponse = {
  comments: [],
  currentUserId: null,
  error: null,
  loginUrl: null
};

type ReelsCommentsBodyProps = {
  active: boolean;
  context: ReelsAnalyticsContext | null;
  onCommentCreated: () => void;
  onTotalCountChange?: (count: number) => void;
  variant?: "panel" | "sheet";
};

export function ReelsCommentsBody({
  active,
  context,
  onCommentCreated,
  onTotalCountChange,
  variant = "panel"
}: ReelsCommentsBodyProps) {
  const [data, setData] = useState<CommentResponse>(initialResponse);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const totalCommentCount = useMemo(
    () => data.comments.reduce((count, comment) => count + 1 + comment.replies.length, 0),
    [data.comments]
  );

  useEffect(() => {
    onTotalCountChange?.(totalCommentCount);
  }, [onTotalCountChange, totalCommentCount]);

  const loadComments = useCallback(async () => {
    if (!context) {
      return;
    }

    setLoading(true);

    try {
      const query = new URLSearchParams({
        storyId: context.item.storyId
      });
      if (context.item.chapterId) {
        query.set("episodeId", context.item.chapterId);
      }

      const response = await fetch(`/api/reels/comments?${query.toString()}`, {
        cache: "no-store"
      });
      const payload = (await response.json()) as CommentResponse;
      setData(payload);
    } finally {
      setLoading(false);
    }
  }, [context]);

  useEffect(() => {
    if (!active || !context) {
      return;
    }

    trackFeedComment(context);
    const frame = window.requestAnimationFrame(() => {
      void loadComments();
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [active, context, loadComments]);

  useEffect(() => {
    if (!active || !context) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [active, context?.item.id, context?.item.chapterId]);

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
          episodeId: context.item.chapterId,
          parentId: parentId ?? null,
          storyId: context.item.storyId,
          reelItemId: context.item.reelItemId,
          reelSlug: context.item.reelSlug,
          reelPublicCode: context.item.reelPublicCode,
          reelHref: context.item.reelHref,
          contentSource: context.item.contentSource
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

  if (!context) {
    return null;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {variant === "panel" ? (
        <p className="shrink-0 px-4 pb-2 pt-1 text-center text-[0.8rem] tabular-nums text-[#6b7280] sm:px-5">
          {totalCommentCount} bình luận
        </p>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-1 sm:px-5">
        {loading ? (
          <div className="py-8 text-center text-sm text-[#6b7280]">Đang tải bình luận...</div>
        ) : data.comments.length === 0 ? (
          <div className="py-8 text-center text-sm text-[#6b7280]">
            Chưa có bình luận. Hãy là người đầu tiên!
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
          inputRef={inputRef}
          onSubmit={(content) => void submitComment(content)}
          placeholder={
            data.currentUserId ? "Viết bình luận..." : "Đăng nhập để bình luận..."
          }
        />
        {data.error ? (
          <p className="mt-2 text-sm text-[#dc2626]">{data.error}</p>
        ) : null}
      </div>
    </div>
  );
}
