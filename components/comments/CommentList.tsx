import { CommentItem } from "@/components/comments/CommentItem";
import { EmptyState } from "@/components/ui";
import type { CommentView } from "@/lib/comments/getComments";

type CommentListProps = {
  comments: CommentView[];
  returnTo: string;
};

export function CommentList({ comments, returnTo }: CommentListProps) {
  if (comments.length === 0) {
    return (
      <EmptyState
        description="Hãy là người đầu tiên chia sẻ cảm nhận."
        title="Chưa có bình luận"
      />
    );
  }

  return (
    <div className="space-y-3">
      {comments.map((comment) => (
        <CommentItem comment={comment} key={comment.id} returnTo={returnTo} />
      ))}
    </div>
  );
}
