"use client";

import Link from "next/link";
import { CommentForm } from "@/components/comments/CommentForm";
import { CommentList } from "@/components/comments/CommentList";
import { CommunityGroupLink } from "@/components/community/CommunityGroupLink";
import { ReaderSheet } from "@/components/reader/ReaderSheet";
import type { CommentView } from "@/lib/comments/getComments";

type ChapterCommentsSheetProps = {
  open: boolean;
  onClose: () => void;
  comments: CommentView[];
  currentUserId: string | null;
  returnTo: string;
  storyId: string;
  storySlug: string;
  episodeId: string;
};

export function ChapterCommentsSheet({
  comments,
  currentUserId,
  episodeId,
  onClose,
  open,
  returnTo,
  storyId,
  storySlug
}: ChapterCommentsSheetProps) {
  const title =
    comments.length > 0 ? `Bình luận (${comments.length})` : "Bình luận";

  return (
    <ReaderSheet className="lg:hidden" onClose={onClose} open={open} title={title}>
      <div className="flex min-h-[50dvh] flex-col">
        <div className="shrink-0 pb-2">
          <CommunityGroupLink
            className="text-xs font-semibold text-cyan-300"
            label="Xem thảo luận trong group"
            storySlug={storySlug}
          />
        </div>
        <div className="shrink-0 pb-3">
          {currentUserId ? (
            <CommentForm episodeId={episodeId} returnTo={returnTo} storyId={storyId} />
          ) : (
            <div className="space-y-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
              <p className="text-sm text-zinc-400">Đăng nhập để tham gia bình luận.</p>
              <Link
                className="inline-flex min-h-10 w-full items-center justify-center rounded-full bg-cyan-300 px-4 text-sm font-bold text-zinc-950"
                href={`/login?next=${encodeURIComponent(returnTo)}`}
              >
                Đăng nhập
              </Link>
            </div>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto pb-2">
          <CommentList comments={comments} returnTo={returnTo} />
        </div>
      </div>
    </ReaderSheet>
  );
}
