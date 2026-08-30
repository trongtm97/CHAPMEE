import Link from "next/link";
import { CommentForm } from "@/components/comments/CommentForm";
import { CommentList } from "@/components/comments/CommentList";
import { CommunityGroupLink } from "@/components/community/CommunityGroupLink";
import { Card, ErrorState, SectionHeader } from "@/components/ui";
import { getComments, type CommentTarget } from "@/lib/comments/getComments";

type CommentsProps = {
  target: CommentTarget;
  returnTo: string;
  title?: string;
  storySlug?: string;
  aggregateStoryComments?: boolean;
};

export async function Comments({
  aggregateStoryComments = false,
  returnTo,
  target,
  title = "Bình luận",
  storySlug
}: CommentsProps) {
  const { comments, currentUserId, error } = await getComments({
    ...target,
    aggregateStoryComments: aggregateStoryComments || target.aggregateStoryComments
  });

  return (
    <section className="space-y-4" id="comments">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <SectionHeader title={title} />
        {storySlug ? (
          <CommunityGroupLink
            label="Xem thảo luận trong group"
            storySlug={storySlug}
          />
        ) : null}
      </div>
      {error ? (
        <ErrorState message={error} title="Could not load comments" />
      ) : null}
      {currentUserId ? (
        <CommentForm
          episodeId={target.episodeId}
          returnTo={returnTo}
          storyId={target.storyId}
        />
      ) : (
        <Card className="space-y-3">
          <p className="text-sm leading-6 text-zinc-300">
            Đăng nhập để tham gia bình luận cùng độc giả khác.
          </p>
          <Link
            className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-cyan-300 px-4 py-2 text-sm font-semibold text-zinc-950"
            href={`/login?next=${encodeURIComponent(returnTo)}`}
          >
            Đăng nhập để bình luận
          </Link>
        </Card>
      )}
      <CommentList comments={comments} returnTo={returnTo} />
    </section>
  );
}
