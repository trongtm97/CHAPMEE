"use client";

import { useEffect, useState, useTransition } from "react";
import { ReaderSheet } from "@/components/reader/ReaderSheet";
import { InlineCommentComposer } from "@/components/reader/inline-comments/InlineCommentComposer";
import { InlineCommentList } from "@/components/reader/inline-comments/InlineCommentList";
import { InlineCommentReplyForm } from "@/components/reader/inline-comments/InlineCommentReplyForm";
import { useInlineCommentReader } from "@/components/reader/inline-comments/InlineCommentReaderContext";
import { loadInlineThreadDetailAction } from "@/lib/inline-comments/inline-comment-actions";
import type { InlineThreadDetail } from "@/types/inline-comment";

export function InlineCommentThreadSheet() {
  const ctx = useInlineCommentReader();
  const [detail, setDetail] = useState<InlineThreadDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const open = Boolean(ctx?.openThreadId || ctx?.pendingAnchor);
  const isNewThread = Boolean(ctx?.pendingAnchor && !ctx?.openThreadId);

  useEffect(() => {
    if (!ctx?.openThreadId) {
      setDetail(null);
      return;
    }

    startTransition(async () => {
      setError(null);
      const loaded = await loadInlineThreadDetailAction(ctx.openThreadId!);
      if (!loaded) {
        setError("Không tải được luồng bình luận.");
        setDetail(null);
        return;
      }
      setDetail(loaded);
    });
  }, [ctx?.openThreadId]);

  if (!ctx?.enabled) {
    return null;
  }

  function closeSheet() {
    ctx?.setOpenThreadId(null);
    ctx?.setPendingAnchor(null);
    setDetail(null);
    setError(null);
  }

  const title = isNewThread
    ? "Bình luận đoạn này"
    : detail
      ? `Bình luận đoạn (${detail.commentCount})`
      : "Bình luận đoạn";

  return (
    <ReaderSheet className="lg:max-w-md" onClose={closeSheet} open={open} title={title}>
      {isNewThread && ctx.pendingAnchor ? (
        <InlineCommentComposer
          blockId={ctx.pendingAnchor.blockId}
          chapterId={ctx.chapterId}
          endOffset={ctx.pendingAnchor.endOffset}
          loggedIn={ctx.loggedIn}
          onCancel={closeSheet}
          onSuccess={(threadId) => {
            ctx.setPendingAnchor(null);
            ctx.setOpenThreadId(threadId);
          }}
          quoteText={ctx.pendingAnchor.quoteText}
          returnTo={ctx.returnTo}
          startOffset={ctx.pendingAnchor.startOffset}
          storyId={ctx.storyId}
        />
      ) : isPending && !detail ? (
        <p className="text-sm text-zinc-500">Đang tải…</p>
      ) : error ? (
        <p className="text-sm text-rose-300">{error}</p>
      ) : detail ? (
        <div className="space-y-4">
          <blockquote className="rounded-lg border-l-2 border-cyan-400/40 bg-white/[0.03] px-3 py-2 text-sm italic text-zinc-300">
            {detail.anchorStatus === "orphaned" ? (
              <span className="mb-1 block text-xs not-italic text-amber-300/90">
                Đoạn gốc đã thay đổi — hiển thị bản sao:
              </span>
            ) : null}
            “{detail.quoteText.trim()}”
          </blockquote>
          <InlineCommentList
            comments={detail.comments}
            currentUserId={ctx.currentUserId}
            loggedIn={ctx.loggedIn}
            onReplyPosted={() => {
              void loadInlineThreadDetailAction(detail.threadId).then((next) => {
                if (next) {
                  setDetail(next);
                }
              });
            }}
            returnTo={ctx.returnTo}
            threadId={detail.threadId}
          />
          <div className="border-t border-white/8 pt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Thêm bình luận
            </p>
            <InlineCommentReplyForm
              loggedIn={ctx.loggedIn}
              onSuccess={() => {
                void loadInlineThreadDetailAction(detail.threadId).then((next) => {
                  if (next) {
                    setDetail(next);
                  }
                });
              }}
              returnTo={ctx.returnTo}
              threadId={detail.threadId}
            />
          </div>
        </div>
      ) : null}
    </ReaderSheet>
  );
}
