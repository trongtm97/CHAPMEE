"use client";

import { useEffect, useState } from "react";
import type { ReelsAnalyticsContext } from "@/lib/analytics/trackReelsEvents";

type CommentView = {
  id: string;
  content: string;
  author: { displayName: string | null } | null;
  replies: unknown[];
};

type ReelsCommentPanelProps = {
  context: ReelsAnalyticsContext | null;
  onOpenComments: () => void;
};

export function ReelsCommentPanel({ context, onOpenComments }: ReelsCommentPanelProps) {
  const [comments, setComments] = useState<CommentView[]>([]);
  const [loadedEpisodeId, setLoadedEpisodeId] = useState<string | null>(null);

  useEffect(() => {
    if (!context) {
      return;
    }

    let mounted = true;
    const query = new URLSearchParams({
      storyId: context.item.storyId,
      episodeId: context.item.id
    });

    fetch(`/api/reels/comments?${query.toString()}`, { cache: "no-store" })
      .then((response) => response.json())
      .then((payload: { comments?: CommentView[] }) => {
        if (!mounted) {
          return;
        }
        setComments(payload.comments ?? []);
        setLoadedEpisodeId(context.item.id);
      })
      .catch(() => {
        if (mounted) {
          setComments([]);
          setLoadedEpisodeId(context.item.id);
        }
      });

    return () => {
      mounted = false;
    };
  }, [context]);

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-200/90">
          Comments
        </p>
        <button
          className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold text-zinc-100"
          onClick={onOpenComments}
          type="button"
        >
          Mở khung bình luận
        </button>
      </div>
      <div className="mt-3 space-y-2">
        {loadedEpisodeId !== context?.item.id ? (
          <p className="text-sm text-zinc-400">Đang tải bình luận...</p>
        ) : null}
        {loadedEpisodeId === context?.item.id && comments.length === 0 ? (
          <p className="text-sm text-zinc-400">Chưa có bình luận, hãy mở hàng cho chap này.</p>
        ) : null}
        {loadedEpisodeId === context?.item.id
          ? comments.slice(0, 3).map((comment) => (
              <article className="rounded-xl border border-white/10 bg-black/20 p-3" key={comment.id}>
                <p className="text-xs font-semibold text-zinc-300">
                  {comment.author?.displayName ?? "Độc giả"}
                </p>
                <p className="mt-1 line-clamp-2 text-sm text-zinc-100">{comment.content}</p>
              </article>
            ))
          : null}
      </div>
    </section>
  );
}
