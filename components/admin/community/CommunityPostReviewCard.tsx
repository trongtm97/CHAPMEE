import Link from "next/link";
import { ApproveButton } from "@/components/admin/content/ApproveButton";
import { RejectWithNoteForm } from "@/components/admin/content/RejectWithNoteForm";
import { Badge, Card } from "@/components/ui";
import { approveCommunityPostAction } from "@/lib/admin/approveCommunityPost";
import { rejectCommunityPostAction } from "@/lib/admin/rejectCommunityPost";
import type { CommunityPostForReview } from "@/lib/admin/getPendingCommunityPosts";

type CommunityPostReviewCardProps = {
  post: CommunityPostForReview;
};

const typeLabel: Record<CommunityPostForReview["type"], string> = {
  discussion: "Discussion",
  review: "Review",
  poll_placeholder: "Poll placeholder",
  challenge: "Challenge"
};

const statusVariant: Record<
  CommunityPostForReview["status"],
  "warning" | "danger" | "default"
> = {
  pending: "warning",
  rejected: "danger",
  hidden: "default"
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(value));
}

export function CommunityPostReviewCard({
  post
}: CommunityPostReviewCardProps) {
  return (
    <Card className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap gap-2">
            <Badge>{typeLabel[post.type]}</Badge>
            <Badge variant={statusVariant[post.status]}>{post.status}</Badge>
          </div>
          <h2 className="text-lg font-semibold text-white">{post.title}</h2>
        </div>
        <p className="shrink-0 text-xs text-zinc-500">
          {formatDate(post.createdAt)}
        </p>
      </div>

      <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-300">
        {post.content}
      </p>

      <div className="space-y-1 text-sm text-zinc-400">
        <p>Author: {post.authorName ?? "Doc gia ChapMee"}</p>
        {post.relatedStorySlug ? (
          <Link
            className="text-cyan-300 hover:text-cyan-200"
            href={`/stories/${post.relatedStorySlug}`}
          >
            Related story: {post.relatedStoryTitle}
          </Link>
        ) : (
          <p>Related story: none</p>
        )}
      </div>

      {post.status === "pending" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <form action={approveCommunityPostAction}>
            <input name="community_post_id" type="hidden" value={post.id} />
            <ApproveButton />
          </form>
          <RejectWithNoteForm
            action={rejectCommunityPostAction}
            idFieldName="community_post_id"
            idValue={post.id}
          />
        </div>
      ) : null}
    </Card>
  );
}
