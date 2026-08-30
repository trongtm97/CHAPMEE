"use client";

import { AuthorNameLink } from "@/components/profile/AuthorNameLink";
import { ReportModal } from "@/components/moderation";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  deleteMyInlineCommentAction,
  replyToInlineThreadAction
} from "@/lib/inline-comments/inline-comment-actions";
import { INLINE_COMMENT_BODY_MAX } from "@/lib/inline-comments/inline-comment-config";
import type { InlineCommentView } from "@/types/inline-comment";

type InlineCommentListProps = {
  comments: InlineCommentView[];
  threadId: string;
  returnTo: string;
  loggedIn: boolean;
  currentUserId: string | null;
  onReplyPosted?: () => void;
};

function formatTime(value: string) {
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(value));
  } catch {
    return "";
  }
}

export function InlineCommentList({
  comments,
  currentUserId,
  loggedIn,
  onReplyPosted,
  returnTo,
  threadId
}: InlineCommentListProps) {
  const router = useRouter();
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const rootComments = comments.filter((comment) => comment.parentId == null);
  const repliesByParent = comments.reduce<Record<string, InlineCommentView[]>>((acc, comment) => {
    if (!comment.parentId) {
      return acc;
    }
    acc[comment.parentId] = [...(acc[comment.parentId] ?? []), comment];
    return acc;
  }, {});

  if (rootComments.length === 0) {
    return <p className="text-sm text-zinc-500">Chưa có bình luận.</p>;
  }

  return (
    <ul className="space-y-4">
      {rootComments.map((comment) => (
        <li className="space-y-3" key={comment.id}>
          <CommentItem
            comment={comment}
            currentUserId={currentUserId}
            loggedIn={loggedIn}
            onDelete={() => {
              startTransition(async () => {
                const result = await deleteMyInlineCommentAction(comment.id, returnTo);
                if (!result.ok) {
                  setError(result.error);
                  return;
                }
                router.refresh();
                onReplyPosted?.();
              });
            }}
            onReply={() => {
              setReplyToId(comment.id);
              setReplyBody("");
              setError(null);
            }}
            returnTo={returnTo}
          />
          {(repliesByParent[comment.id] ?? []).map((reply) => (
            <div className="ml-4 border-l border-white/10 pl-3" key={reply.id}>
              <CommentItem
                comment={reply}
                currentUserId={currentUserId}
                loggedIn={loggedIn}
                onDelete={() => {
                  startTransition(async () => {
                    const result = await deleteMyInlineCommentAction(reply.id, returnTo);
                    if (!result.ok) {
                      setError(result.error);
                      return;
                    }
                    router.refresh();
                    onReplyPosted?.();
                  });
                }}
                returnTo={returnTo}
              />
            </div>
          ))}
          {replyToId === comment.id ? (
            <form
              className="ml-4 space-y-2 border-l border-cyan-400/20 pl-3"
              onSubmit={(event) => {
                event.preventDefault();
                if (!loggedIn) {
                  return;
                }
                setError(null);
                startTransition(async () => {
                  const result = await replyToInlineThreadAction(
                    threadId,
                    replyBody,
                    comment.id,
                    returnTo
                  );
                  if (result.loginRequired) {
                    router.push(`/login?next=${encodeURIComponent(returnTo)}`);
                    return;
                  }
                  if (!result.ok) {
                    setError(result.error ?? "Không thể trả lời.");
                    return;
                  }
                  setReplyToId(null);
                  setReplyBody("");
                  router.refresh();
                  onReplyPosted?.();
                });
              }}
            >
              <textarea
                className="min-h-20 w-full resize-y rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-zinc-100 outline-none ring-cyan-400/40 focus:ring-2"
                disabled={isPending}
                maxLength={INLINE_COMMENT_BODY_MAX}
                onChange={(event) => setReplyBody(event.target.value)}
                placeholder="Trả lời…"
                value={replyBody}
              />
              <div className="flex gap-2">
                <button
                  className="min-h-9 rounded-full px-3 text-sm text-zinc-400"
                  onClick={() => setReplyToId(null)}
                  type="button"
                >
                  Hủy
                </button>
                <button
                  className="min-h-9 rounded-full bg-cyan-300 px-4 text-sm font-bold text-zinc-950 disabled:opacity-60"
                  disabled={isPending || !replyBody.trim()}
                  type="submit"
                >
                  Gửi
                </button>
              </div>
            </form>
          ) : null}
        </li>
      ))}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
    </ul>
  );
}

function CommentItem({
  comment,
  currentUserId,
  loggedIn,
  onDelete,
  onReply,
  returnTo
}: {
  comment: InlineCommentView;
  currentUserId: string | null;
  loggedIn: boolean;
  onDelete?: () => void;
  onReply?: () => void;
  returnTo: string;
}) {
  const canReport = loggedIn && currentUserId != null && comment.userId !== currentUserId;

  return (
    <article className="space-y-1">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <AuthorNameLink
          className="text-sm font-semibold text-zinc-100"
          name={comment.displayName ?? comment.username ?? "Độc giả"}
          username={comment.username}
        />
        <time className="text-xs text-zinc-500">{formatTime(comment.createdAt)}</time>
      </div>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">{comment.body}</p>
      <div className="flex flex-wrap items-center gap-3 pt-0.5">
        {onReply ? (
          <button
            className="text-xs font-semibold text-cyan-300/90 hover:text-cyan-200"
            onClick={onReply}
            type="button"
          >
            Trả lời
          </button>
        ) : null}
        {comment.canDelete && onDelete ? (
          <button
            className="text-xs font-semibold text-zinc-500 hover:text-rose-300"
            onClick={onDelete}
            type="button"
          >
            Xóa
          </button>
        ) : null}
        {canReport ? (
          <span className="inline-flex [&_button]:h-auto [&_button]:w-auto [&_button]:min-h-0 [&_button]:bg-transparent [&_button]:px-0 [&_button]:py-0 [&_button]:text-xs [&_button]:font-semibold [&_button]:text-zinc-500 [&_button]:hover:text-rose-300">
            <ReportModal
              returnTo={returnTo}
              targetId={comment.id}
              targetType="inline_comment"
              triggerLabel="Báo cáo"
            />
          </span>
        ) : null}
      </div>
    </article>
  );
}
