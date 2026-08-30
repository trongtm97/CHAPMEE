"use client";

import { useEffect, useState, useTransition } from "react";
import { InlineCommentComposer } from "@/components/reader/inline-comments/InlineCommentComposer";
import { InlineCommentList } from "@/components/reader/inline-comments/InlineCommentList";
import { InlineCommentReplyForm } from "@/components/reader/inline-comments/InlineCommentReplyForm";
import { useInlineCommentReader } from "@/components/reader/inline-comments/InlineCommentReaderContext";
import {
  getInlineCommentsAction,
  getInlineThreadsForBlockAction,
  loadInlineThreadDetailAction
} from "@/lib/inline-comments/inline-comment-actions";
import type { InlineCommentView, InlineThreadDetail, InlineThreadSummary } from "@/types/inline-comment";

export function InlineCommentThread() {
  const ctx = useInlineCommentReader();
  const [blockThreads, setBlockThreads] = useState<InlineThreadSummary[]>([]);
  const [detail, setDetail] = useState<InlineThreadDetail | null>(null);
  const [comments, setComments] = useState<InlineCommentView[]>([]);
  const [commentsPage, setCommentsPage] = useState(1);
  const [hasMoreComments, setHasMoreComments] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!ctx?.openThreadId) {
      setDetail(null);
      setComments([]);
      setCommentsPage(1);
      setHasMoreComments(false);
      return;
    }

    const threadId = ctx.openThreadId;

    startTransition(async () => {
      setError(null);
      const [loadedDetail, loadedComments] = await Promise.all([
        loadInlineThreadDetailAction(threadId),
        getInlineCommentsAction(threadId, 1)
      ]);

      if (!loadedDetail) {
        setError("Không tải được luồng bình luận.");
        setDetail(null);
        setComments([]);
        return;
      }

      setDetail(loadedDetail);
      setComments(loadedComments.comments);
      setCommentsPage(1);
      setHasMoreComments(loadedComments.hasMore);
    });
  }, [ctx?.openThreadId]);

  useEffect(() => {
    if (!ctx?.activeBlockId || ctx.openThreadId || ctx.pendingAnchor) {
      setBlockThreads([]);
      return;
    }

    const reader = ctx;
    const activeBlockId = reader.activeBlockId;
    if (!activeBlockId) {
      return;
    }

    startTransition(async () => {
      setError(null);
      const threads = await getInlineThreadsForBlockAction(reader.chapterId, activeBlockId);
      setBlockThreads(threads);

      if (threads.length === 1) {
        reader.setOpenThreadId(threads[0]!.threadId);
      }
    });
  }, [ctx?.activeBlockId, ctx?.chapterId, ctx?.openThreadId, ctx?.pendingAnchor, ctx]);

  if (!ctx?.enabled) {
    return null;
  }

  const reader = ctx;
  const isNewThread = Boolean(reader.pendingAnchor && !reader.openThreadId);

  async function reloadComments(threadId: string, page = 1, append = false) {
    const loaded = await getInlineCommentsAction(threadId, page);
    setComments((current) => (append ? [...current, ...loaded.comments] : loaded.comments));
    setCommentsPage(page);
    setHasMoreComments(loaded.hasMore);
  }

  async function reloadThread(threadId: string) {
    const [loadedDetail, loadedComments] = await Promise.all([
      loadInlineThreadDetailAction(threadId),
      getInlineCommentsAction(threadId, 1)
    ]);
    if (loadedDetail) {
      setDetail(loadedDetail);
    }
    setComments(loadedComments.comments);
    setCommentsPage(1);
    setHasMoreComments(loadedComments.hasMore);
    void reader.refreshBlockCounts();
  }

  if (isNewThread && reader.pendingAnchor) {
    return (
      <InlineCommentComposer
        blockId={reader.pendingAnchor.blockId}
        blockIndex={reader.pendingAnchor.blockIndex}
        chapterId={reader.chapterId}
        contentHashAtAnchor={reader.contentHash}
        endOffset={reader.pendingAnchor.endOffset}
        loggedIn={reader.loggedIn}
        onCancel={() => {
          reader.setPendingAnchor(null);
          reader.setActiveBlockId(null);
        }}
        onSuccess={(threadId) => {
          reader.setPendingAnchor(null);
          reader.setOpenThreadId(threadId);
          void reloadThread(threadId);
        }}
        prefixText={reader.pendingAnchor.prefixText}
        quoteText={reader.pendingAnchor.quoteText}
        returnTo={reader.returnTo}
        startOffset={reader.pendingAnchor.startOffset}
        storyId={reader.storyId}
        suffixText={reader.pendingAnchor.suffixText}
      />
    );
  }

  if (isPending && !detail && blockThreads.length === 0 && !reader.openThreadId) {
    return <p className="text-sm text-zinc-500">Đang tải…</p>;
  }

  if (error) {
    return <p className="text-sm text-rose-300">{error}</p>;
  }

  if (!reader.openThreadId && blockThreads.length > 1) {
    return (
      <ul className="space-y-2">
        {blockThreads.map((thread) => (
          <li key={thread.threadId}>
            <button
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-left text-sm text-zinc-200 hover:border-cyan-400/30"
              onClick={() => reader.setOpenThreadId(thread.threadId)}
              type="button"
            >
              <span className="line-clamp-2 italic text-zinc-400">“{thread.quoteText.trim()}”</span>
              <span className="mt-1 block text-xs font-semibold text-cyan-300">
                {thread.commentCount} bình luận
              </span>
            </button>
          </li>
        ))}
      </ul>
    );
  }

  if (!detail) {
    return null;
  }

  return (
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
        comments={comments}
        currentUserId={reader.currentUserId}
        loggedIn={reader.loggedIn}
        onReplyPosted={() => {
          void reloadThread(detail.threadId);
        }}
        returnTo={reader.returnTo}
        threadId={detail.threadId}
      />
      {hasMoreComments ? (
        <button
          className="text-sm font-semibold text-cyan-300 hover:text-cyan-200"
          disabled={isPending}
          onClick={() => {
            startTransition(async () => {
              await reloadComments(detail.threadId, commentsPage + 1, true);
            });
          }}
          type="button"
        >
          Xem thêm bình luận
        </button>
      ) : null}
      <div className="border-t border-white/8 pt-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Thêm bình luận
        </p>
        <InlineCommentReplyForm
          loggedIn={reader.loggedIn}
          onSuccess={() => {
            void reloadThread(detail.threadId);
          }}
          returnTo={reader.returnTo}
          threadId={detail.threadId}
        />
      </div>
    </div>
  );
}
