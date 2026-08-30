"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { replyToInlineThreadAction } from "@/lib/inline-comments/inline-comment-actions";
import { INLINE_COMMENT_BODY_MAX } from "@/lib/inline-comments/inline-comment-config";

type InlineCommentReplyFormProps = {
  threadId: string;
  returnTo: string;
  loggedIn: boolean;
  onSuccess: () => void;
};

export function InlineCommentReplyForm({
  loggedIn,
  onSuccess,
  returnTo,
  threadId
}: InlineCommentReplyFormProps) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!loggedIn) {
    return (
      <div className="space-y-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
        <p className="text-sm text-zinc-400">Đăng nhập để tham gia bình luận.</p>
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
      className="space-y-2"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        startTransition(async () => {
          const result = await replyToInlineThreadAction(threadId, body, null, returnTo);
          if (result.loginRequired) {
            router.push(`/login?next=${encodeURIComponent(returnTo)}`);
            return;
          }
          if (!result.ok) {
            setError(result.error ?? "Không thể gửi bình luận.");
            return;
          }
          setBody("");
          router.refresh();
          onSuccess();
        });
      }}
    >
      <textarea
        className="min-h-20 w-full resize-y rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-zinc-100 outline-none ring-cyan-400/40 focus:ring-2"
        disabled={isPending}
        maxLength={INLINE_COMMENT_BODY_MAX}
        onChange={(event) => setBody(event.target.value)}
        placeholder="Viết bình luận…"
        value={body}
      />
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      <button
        className="min-h-10 w-full rounded-full bg-cyan-300 px-4 text-sm font-bold text-zinc-950 disabled:opacity-60"
        disabled={isPending || !body.trim()}
        type="submit"
      >
        {isPending ? "Đang gửi…" : "Gửi bình luận"}
      </button>
    </form>
  );
}
