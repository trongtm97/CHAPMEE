import { deleteCommentAction } from "@/lib/comments/deleteComment";
import { ReportButton } from "@/components/report/ReportButton";
import { AuthorNameLink } from "@/components/profile/AuthorNameLink";
import { Badge, Button, Card } from "@/components/ui";
import type { CommentView } from "@/lib/comments/getComments";

type CommentItemProps = {
  comment: CommentView;
  returnTo: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(value));
}

export function CommentItem({ comment, returnTo }: CommentItemProps) {
  return (
    <Card className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">
            <AuthorNameLink
              badge={comment.verification}
              name={comment.displayName ?? "Độc giả ChapMee"}
              username={comment.username}
            />
          </p>
          {comment.isVip ? <Badge className="mt-1" variant="success">VIP</Badge> : null}
          <p className="mt-1 text-xs text-zinc-500">
            {formatDate(comment.createdAt)}
          </p>
        </div>
        {comment.canDelete ? (
          <form action={deleteCommentAction}>
            <input name="commentId" type="hidden" value={comment.id} />
            <input name="returnTo" type="hidden" value={returnTo} />
            <Button
              className="min-h-9 px-3 text-xs"
              type="submit"
              variant="ghost"
            >
              Xóa
            </Button>
          </form>
        ) : null}
      </div>
      <p className="text-sm leading-6 text-zinc-300">{comment.content}</p>
      <ReportButton
        returnTo={returnTo}
        targetId={comment.id}
        targetType="comment"
      />
    </Card>
  );
}
