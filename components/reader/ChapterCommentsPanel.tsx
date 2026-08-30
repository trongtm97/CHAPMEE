"use client";

import Link from "next/link";
import { CommentForm } from "@/components/comments/CommentForm";
import { CommentList } from "@/components/comments/CommentList";
import { CommunityGroupLink } from "@/components/community/CommunityGroupLink";
import { SectionHeading } from "@/components/seo/SectionHeading";
import type { CommentView } from "@/lib/comments/getComments";

type ChapterCommentsPanelProps = {
  comments: CommentView[];
  currentUserId: string | null;
  returnTo: string;
  storyId: string;
  storySlug: string;
  episodeId: string;
};

export function ChapterCommentsPanel({
  comments,
  currentUserId,
  episodeId,
  returnTo,
  storyId,
  storySlug
}: ChapterCommentsPanelProps) {
  return (
    <aside
      aria-label="Bình luận chương"
      className="reader-comments-panel hidden w-full lg:flex lg:max-h-[calc(100dvh-5.5rem)] lg:flex-col lg:overflow-hidden lg:rounded-xl lg:border lg:border-white/[0.06] lg:bg-[#0b1016]/90 lg:shadow-[0_8px_32px_rgba(0,0,0,0.24)]"
      id="reader-comments-panel"
    >
      <div className="shrink-0 border-b border-white/[0.06] px-3 py-2.5">
        <div className="flex items-start justify-between gap-2">
          <SectionHeading as="h2" className="text-sm font-bold text-zinc-100">
            Bình luận
            {comments.length > 0 ? (
              <span className="ml-1.5 font-medium text-zinc-500">({comments.length})</span>
            ) : null}
          </SectionHeading>
          <CommunityGroupLink
            className="shrink-0 text-[0.65rem] font-semibold leading-4 text-cyan-300"
            label="Xem thảo luận trong group"
            storySlug={storySlug}
          />
        </div>
      </div>

      <div className="shrink-0 border-b border-white/[0.06] bg-[#0b1016]/95 px-3 py-3">
        {currentUserId ? (
          <CommentForm episodeId={episodeId} returnTo={returnTo} storyId={storyId} variant="compact" />
        ) : (
          <div className="space-y-2 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
            <p className="text-xs leading-5 text-zinc-400">
              Đăng nhập để bình luận và xem phản hồi từ độc giả khác.
            </p>
            <Link
              className="inline-flex min-h-9 w-full items-center justify-center rounded-full bg-cyan-300 px-3 text-xs font-bold text-zinc-950"
              href={`/login?next=${encodeURIComponent(returnTo)}`}
            >
              Đăng nhập để bình luận
            </Link>
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3">
        {comments.length === 0 ? (
          <p className="py-8 text-center text-xs leading-5 text-zinc-500">
            Chưa có bình luận. Hãy là người đầu tiên chia sẻ cảm nhận về chương này.
          </p>
        ) : (
          <CommentList comments={comments} returnTo={returnTo} />
        )}
      </div>
    </aside>
  );
}

/** Focus desktop comment composer; returns true if handled on desktop. */
export function focusReaderCommentsPanel() {
  if (typeof window === "undefined") {
    return false;
  }

  if (!window.matchMedia("(min-width: 1024px)").matches) {
    return false;
  }

  const panel = document.getElementById("reader-comments-panel");
  if (!panel) {
    return false;
  }

  panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  const textarea = panel.querySelector<HTMLTextAreaElement>("textarea[name='content']");
  if (textarea) {
    window.setTimeout(() => textarea.focus(), 280);
  }
  return true;
}
