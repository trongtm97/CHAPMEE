"use client";

import Link from "next/link";
import { getStoryDetailHref } from "@/lib/stories/story-routes";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CommunityPollCard } from "@/components/community/CommunityPollCard";
import { CommunityPostMenu } from "@/components/community/CommunityPostMenu";
import { SpoilerContent } from "@/components/community/SpoilerContent";
import { AuthorNameLink } from "@/components/profile/AuthorNameLink";
import { AvatarFallback, Badge } from "@/components/ui";
import { createCommunityPostCommentAction } from "@/lib/comments/community-post-comment-actions";
import type { CommentView } from "@/lib/comments/getComments";
import { enrichCommunityPosts } from "@/lib/community/build-unified-feed";
import type { CommunityPost } from "@/lib/community/getCommunityFeed";
import { getCreatorPublicHref } from "@/lib/profile/profile-url";
import { formatRelativeTime } from "@/lib/notifications/format-relative-time";

type CommunityPostDetailProps = {
  post: CommunityPost;
  comments: CommentView[];
  commentsEnabled?: boolean;
};

export function CommunityPostDetail({
  post,
  comments,
  commentsEnabled = true
}: CommunityPostDetailProps) {
  const router = useRouter();
  const enriched = enrichCommunityPosts([post])[0];
  const authorProfileHref = getCreatorPublicHref({
    username: enriched.authorUsername,
    userId: enriched.authorUserId
  });
  const [reply, setReply] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (enriched.type === "poll_placeholder" && enriched.pollOptions) {
    return (
      <div className="space-y-6">
        <BackLink />
        <CommunityPollCard
          poll={{
            id: enriched.id,
            question: enriched.title,
            options: enriched.pollOptions,
            postId: enriched.id
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BackLink />

      <article className="chap-card space-y-4 p-4">
        <header className="flex items-start gap-3">
          {authorProfileHref ? (
            <Link className="shrink-0" href={authorProfileHref}>
              <AvatarFallback name={enriched.authorName} size="sm" src={enriched.authorAvatarUrl} />
            </Link>
          ) : (
            <AvatarFallback name={enriched.authorName} size="sm" src={enriched.authorAvatarUrl} />
          )}
          <div className="min-w-0 flex-1">
            <p className="font-bold text-white">
              <AuthorNameLink
                name={enriched.authorName}
                userId={enriched.authorUserId}
                username={enriched.authorUsername}
              />
            </p>
            <p className="text-xs text-zinc-500">
              {new Date(enriched.createdAt).toLocaleString("vi-VN")}
            </p>
          </div>
          <CommunityPostMenu postId={enriched.id} />
        </header>

        {enriched.relatedStoryTitle &&
        enriched.relatedStorySlug &&
        enriched.relatedStoryPublicCode ? (
          <Link
            className="inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/8 px-2.5 py-1 text-xs font-semibold text-cyan-100"
            href={getStoryDetailHref({
              slug: enriched.relatedStorySlug,
              public_code: enriched.relatedStoryPublicCode
            })}
          >
            {enriched.relatedStoryTitle}
          </Link>
        ) : null}

        <h1 className="text-xl font-black text-white">{enriched.title}</h1>
        <SpoilerContent isSpoiler={enriched.isSpoiler}>
          <p className="whitespace-pre-wrap text-sm leading-7 text-zinc-200">
            {post.contentPreview}
          </p>
        </SpoilerContent>
      </article>

      <section className="space-y-3" id="comments">
        <h2 className="text-sm font-bold text-zinc-100">
          Bình luận ({comments.length})
        </h2>
        {!commentsEnabled ? (
          <p className="text-sm text-zinc-500">
            Bình luận bài cộng đồng sẽ sẵn sàng sau khi cập nhật cơ sở dữ liệu (migration 080).
          </p>
        ) : null}
        <div className="space-y-2">
          {comments.map((comment) => (
            <CommentRow comment={comment} key={comment.id} />
          ))}
        </div>

        <form
          className="space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (!commentsEnabled) {
              return;
            }

            const trimmed = reply.trim();
            if (!trimmed) {
              return;
            }

            setError(null);
            startTransition(async () => {
              const result = await createCommunityPostCommentAction(post.id, trimmed);

              if (result.loginRequired) {
                router.push(`/login?next=/community/${post.id}`);
                return;
              }

              if (!result.ok) {
                setError(result.error ?? "Không gửi được bình luận.");
                return;
              }

              setReply("");
              router.refresh();
            });
          }}
        >
          <textarea
            className="min-h-24 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:border-cyan-300/50"
            disabled={isPending || !commentsEnabled}
            onChange={(event) => setReply(event.target.value)}
            placeholder="Viết bình luận..."
            value={reply}
          />
          {error ? <p className="text-xs text-rose-300">{error}</p> : null}
          <button
            className="tap-highlight inline-flex min-h-10 items-center justify-center rounded-full bg-cyan-300 px-4 text-xs font-black uppercase tracking-[0.1em] text-zinc-950 disabled:opacity-50"
            disabled={isPending || !commentsEnabled || !reply.trim()}
            type="submit"
          >
            {isPending ? "Đang gửi..." : "Gửi bình luận"}
          </button>
        </form>
      </section>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      className="inline-flex text-sm font-semibold text-cyan-300 hover:text-cyan-200"
      href="/community"
    >
      ← Về Cộng đồng
    </Link>
  );
}

function CommentRow({ comment }: { comment: CommentView }) {
  return (
    <div className="chap-card space-y-2 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <AvatarFallback name={comment.displayName ?? "Độc giả"} size="sm" src={comment.avatarUrl} />
          <div>
            <p className="text-sm font-bold text-white">
              <AuthorNameLink
                badge={comment.verification}
                name={comment.displayName ?? "Độc giả"}
                userId={comment.userId}
                username={comment.username}
              />
            </p>
            {comment.isVip ? (
              <Badge className="mt-0.5 px-2 py-0.5 text-[0.62rem]" variant="success">
                VIP
              </Badge>
            ) : null}
            {comment.isPinned ? (
              <p className="text-[0.65rem] font-bold uppercase tracking-wide text-amber-200">
                Ghim bởi tác giả
              </p>
            ) : null}
          </div>
        </div>
        <span className="text-xs text-zinc-500">
          {formatRelativeTime(comment.createdAt)}
        </span>
      </div>

      <p className="text-sm leading-6 text-zinc-300">{comment.content}</p>
    </div>
  );
}
