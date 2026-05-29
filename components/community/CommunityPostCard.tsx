"use client";

import Link from "next/link";
import { useState } from "react";
import { CommunityPostMenu } from "@/components/community/CommunityPostMenu";
import { CommunityPollCard } from "@/components/community/CommunityPollCard";
import { SpoilerContent } from "@/components/community/SpoilerContent";
import { AvatarFallback, Badge } from "@/components/ui";
import type { EnrichedCommunityPost } from "@/types/community";
import type { CommunityPostType } from "@/lib/community/getCommunityFeed";

type CommunityPostCardProps = {
  post: EnrichedCommunityPost;
  onHide?: (postId: string) => void;
};

const typeLabel: Record<CommunityPostType, string> = {
  discussion: "Thảo luận",
  review: "Review",
  poll_placeholder: "Bình chọn",
  challenge: "Thử thách"
};

const roleLabel = {
  creator: "Tác giả",
  reader: "Độc giả",
  mod: "Mod"
} as const;

function formatRelativeTime(value: string) {
  const diffMs = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(diffMs / 60000);

  if (minutes < 1) {
    return "Vừa xong";
  }

  if (minutes < 60) {
    return `${minutes} phút`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours} giờ`;
  }

  const days = Math.floor(hours / 24);

  return `${days} ngày`;
}

export function CommunityPostCard({ onHide, post }: CommunityPostCardProps) {
  const [voteCount, setVoteCount] = useState(post.voteCount);
  const [hasVoted, setHasVoted] = useState(false);
  const [saved, setSaved] = useState(false);

  function handleVote() {
    if (hasVoted) {
      setVoteCount((count) => Math.max(0, count - 1));
      setHasVoted(false);
    } else {
      setVoteCount((count) => count + 1);
      setHasVoted(true);
    }

    // TODO: onVote(post.id) — persist reaction to backend.
  }

  if (post.type === "poll_placeholder" && post.pollOptions?.length) {
    return (
      <div className="space-y-2">
        <CommunityPollCard
          compact
          poll={{
            id: post.id,
            question: post.title,
            options: post.pollOptions,
            postId: post.id
          }}
        />
        <PostMetaLink postId={post.id} />
      </div>
    );
  }

  return (
    <article className="chap-card space-y-3 p-4 transition hover:border-cyan-300/20">
      <header className="flex items-start gap-3">
        <AvatarFallback name={post.authorName} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-bold text-white">{post.authorName}</p>
            <Badge
              className="px-2 py-0.5 text-[0.62rem]"
              variant={post.authorRole === "creator" ? "success" : "default"}
            >
              {roleLabel[post.authorRole]}
            </Badge>
          </div>
          <p className="text-xs text-zinc-500">{formatRelativeTime(post.createdAt)}</p>
        </div>
        <CommunityPostMenu
          onHide={() => onHide?.(post.id)}
          postId={post.id}
        />
      </header>

      <div className="space-y-2">
        <Badge className="px-2 py-0.5 text-[0.62rem]">{typeLabel[post.type]}</Badge>
        {post.relatedStoryTitle ? (
          <div>
            {post.relatedStorySlug ? (
              <Link
                className="inline-flex max-w-full truncate rounded-full border border-cyan-300/20 bg-cyan-300/8 px-2.5 py-1 text-xs font-semibold text-cyan-100 hover:border-cyan-300/35"
                href={`/stories/${post.relatedStorySlug}`}
                onClick={(event) => event.stopPropagation()}
              >
                {post.relatedStoryTitle}
              </Link>
            ) : (
              <span className="inline-flex rounded-full border border-white/10 px-2.5 py-1 text-xs text-zinc-300">
                {post.relatedStoryTitle}
              </span>
            )}
          </div>
        ) : null}
        <Link className="block space-y-2" href={`/community/${post.id}`}>
          <h2 className="text-[1.02rem] font-bold leading-7 text-white">{post.title}</h2>
          <SpoilerContent isSpoiler={post.isSpoiler}>
            <p className="line-clamp-3 text-sm leading-6 text-zinc-300">
              {post.contentPreview}
            </p>
          </SpoilerContent>
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-white/5 pt-3">
        <button
          className={`tap-highlight inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-bold transition ${
            hasVoted
              ? "border-cyan-300/40 bg-cyan-300/15 text-cyan-100"
              : "border-white/10 text-zinc-300 hover:border-white/20"
          }`}
          onClick={handleVote}
          type="button"
        >
          <span aria-hidden="true">▲</span>
          <span>Hay</span>
          <span>{voteCount}</span>
        </button>
        <Link
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-white/10 px-3 text-xs font-bold text-zinc-300 hover:border-white/20"
          href={`/community/${post.id}#comments`}
        >
          <span aria-hidden="true">💬</span>
          <span>{post.commentCount}</span>
        </Link>
        <button
          className={`tap-highlight inline-flex min-h-9 items-center gap-1 rounded-full border px-3 text-xs font-bold transition ${
            saved
              ? "border-amber-300/30 bg-amber-300/10 text-amber-200"
              : "border-white/10 text-zinc-300 hover:border-white/20"
          }`}
          onClick={() => setSaved((value) => !value)}
          type="button"
        >
          <span aria-hidden="true">🔖</span>
          <span className="sr-only">Lưu</span>
        </button>
        <button
          className="tap-highlight inline-flex min-h-9 items-center rounded-full border border-white/10 px-3 text-xs font-bold text-zinc-300 hover:border-white/20"
          onClick={() => {
            if (typeof navigator !== "undefined" && navigator.share) {
              void navigator.share({
                title: post.title,
                url: `${window.location.origin}/community/${post.id}`
              });
              return;
            }

            void navigator.clipboard?.writeText(
              `${window.location.origin}/community/${post.id}`
            );
          }}
          type="button"
        >
          <span aria-hidden="true">↗</span>
          <span className="sr-only">Chia sẻ</span>
        </button>
      </div>

      {post.featuredCommentPreview ? (
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2.5 text-sm leading-6 text-zinc-300">
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.12em] text-zinc-500">
            {post.authorReplied ? "Tác giả đã trả lời" : "Bình luận nổi bật"}
          </p>
          <p className="mt-1 line-clamp-2">{post.featuredCommentPreview}</p>
        </div>
      ) : null}

      <Link
        className="inline-flex text-sm font-bold text-cyan-300 hover:text-cyan-200"
        href={`/community/${post.id}`}
      >
        Tham gia thảo luận →
      </Link>
    </article>
  );
}

function PostMetaLink({ postId }: { postId: string }) {
  return (
    <Link
      className="inline-flex px-1 text-sm font-bold text-cyan-300 hover:text-cyan-200"
      href={`/community/${postId}`}
    >
      Xem thread poll →
    </Link>
  );
}
