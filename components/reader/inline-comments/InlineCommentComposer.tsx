"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createInlineCommentThreadAction } from "@/lib/inline-comments/inline-comment-actions";
import { INLINE_COMMENT_BODY_MAX } from "@/lib/inline-comments/inline-comment-config";

type InlineCommentComposerProps = {
  chapterId: string;
  storyId: string;
  quoteText: string;
  blockId: string;
  blockIndex?: number | null;
  startOffset: number;
  endOffset: number;
  prefixText?: string | null;
  suffixText?: string | null;
  contentHashAtAnchor?: string | null;
  returnTo: string;
  loggedIn: boolean;
  onSuccess: (threadId: string) => void;
  onCancel?: () => void;
};

export function InlineCommentComposer({
  blockId,
  blockIndex = null,
  chapterId,
  contentHashAtAnchor = null,
  endOffset,
  loggedIn,
  onCancel,
  onSuccess,
  prefixText = null,
  quoteText,
  returnTo,
  startOffset,
  storyId,
  suffixText = null
}: InlineCommentComposerProps) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!loggedIn) {
    return (
      <div className="space-y-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
        <p className="text-sm text-zinc-400">Đăng nhập để bình luận đoạn này.</p>
        <Link
          className="inline-flex min-h-10 w-full items-center justify-center rounded-full bg-cyan-300 px-4 text-sm font-bold text-zinc-950"
          href={`/login?next=${encodeURIComponent(returnTo)}`}
        >
          Đăng nhập
        </Link>
      </div>
    );
  }

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);

        startTransition(async () => {
          const result = await createInlineCommentThreadAction(
            {
              chapterId,
              storyId,
              blockId,
              blockIndex,
              startOffset,
              endOffset,
              quoteText,
              body,
              contentHashAtAnchor,
              prefixText,
              suffixText
            },
            returnTo
          );

          if (result.loginRequired) {
            router.push(`/login?next=${encodeURIComponent(returnTo)}`);
            return;
          }

          if (!result.ok || !result.threadId) {
            setError(result.error ?? "Không thể gửi bình luận.");
            return;
          }

          setBody("");
          router.refresh();
          onSuccess(result.threadId);
        });
      }}
    >
      <blockquote className="rounded-lg border-l-2 border-cyan-400/40 bg-white/[0.03] px-3 py-2 text-sm italic text-zinc-300">
        “{quoteText.trim()}”
      </blockquote>
      <textarea
        className="min-h-24 w-full resize-y rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-zinc-100 outline-none ring-cyan-400/40 focus:ring-2"
        disabled={isPending}
        maxLength={INLINE_COMMENT_BODY_MAX}
        onChange={(event) => setBody(event.target.value)}
        placeholder="Viết bình luận về đoạn này…"
        value={body}
      />
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      <div className="flex items-center gap-2">
        {onCancel ? (
          <button
            className="min-h-10 rounded-full px-4 text-sm font-semibold text-zinc-400 hover:text-zinc-200"
            disabled={isPending}
            onClick={onCancel}
            type="button"
          >
            Hủy
          </button>
        ) : null}
        <button
          className="min-h-10 flex-1 rounded-full bg-cyan-300 px-4 text-sm font-bold text-zinc-950 disabled:opacity-60"
          disabled={isPending || !body.trim()}
          type="submit"
        >
          {isPending ? "Đang gửi…" : "Gửi bình luận"}
        </button>
      </div>
    </form>
  );
}
