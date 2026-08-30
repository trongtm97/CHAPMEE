import { ReelsCommentInput } from "@/components/reels/ReelsCommentInput";
import { ReelsCount } from "@/components/reels/ReelsCount";
import { AvatarFallback } from "@/components/ui/AvatarFallback";

type ReelsCommentReply = {
  id: string;
  authorLabel: string;
  authorAvatarUrl: string;
  content: string;
  createdAt: string;
  likeCount: number;
  isLiked: boolean;
  canPin: boolean;
  canDelete: boolean;
  isPinned: boolean;
};

export type ReelsCommentView = {
  id: string;
  authorLabel: string;
  authorAvatarUrl: string;
  content: string;
  createdAt: string;
  likeCount: number;
  isLiked: boolean;
  replyCount: number;
  replies: ReelsCommentReply[];
  canPin: boolean;
  canDelete: boolean;
  isPinned: boolean;
};

type ReelsCommentItemProps = {
  activeReplyId: string | null;
  comment: ReelsCommentView;
  isSubmitting: boolean;
  onLike: (commentId: string) => void;
  onPin: (commentId: string, pinned: boolean) => void;
  onReply: (commentId: string) => void;
  onSubmitReply: (parentId: string, content: string) => void;
};

function formatDate(value: string) {
  return new Intl.RelativeTimeFormat("vi", { numeric: "auto" }).format(
    Math.round((new Date(value).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
    "day"
  );
}

function HeartIcon({ active }: { active: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={`size-[1.125rem] ${active ? "fill-current" : ""}`}
      fill={active ? "currentColor" : "none"}
      viewBox="0 0 24 24"
    >
      <path
        d="M12 20.2 4.8 12.9a4.8 4.8 0 0 1 6.8-6.8L12 7.4l.4-1.3a4.8 4.8 0 0 1 6.8 6.8L12 20.2Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg aria-hidden="true" className="size-3.5" fill="none" viewBox="0 0 24 24">
      <path
        d="m8.5 3.5 12 12-2 2-3.5-3.5L9.5 19.5l-1-1 5.5-5.5L6.5 5.5l2-2Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function CommentRow({
  authorAvatarUrl,
  authorLabel,
  content,
  createdAt,
  extraLabel,
  isLiked,
  likeCount,
  onLike
}: {
  authorAvatarUrl: string;
  authorLabel: string;
  content: string;
  createdAt: string;
  extraLabel?: string | null;
  isLiked: boolean;
  likeCount: number;
  onLike: () => void;
}) {
  return (
    <div className="flex items-start gap-3">
      <AvatarFallback name={authorLabel} size="sm" src={authorAvatarUrl} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[0.88rem] font-semibold text-[#111827]">
                {authorLabel}
              </p>
              {extraLabel ? (
                <span className="rounded-full bg-[#111827] px-2 py-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-white">
                  {extraLabel}
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-[0.95rem] leading-6 text-[#111827]">{content}</p>
            <div className="mt-1.5 flex items-center gap-3 text-[0.76rem] font-medium text-[#6b7280]">
              <span>{formatDate(createdAt)}</span>
            </div>
          </div>

          <button
            className={`tap-highlight flex shrink-0 flex-col items-center gap-1 ${
              isLiked ? "text-[#ff4d6d]" : "text-[#9ca3af]"
            }`}
            onClick={onLike}
            type="button"
          >
            <HeartIcon active={isLiked} />
            <ReelsCount value={likeCount} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function ReelsCommentItem({
  activeReplyId,
  comment,
  isSubmitting,
  onLike,
  onPin,
  onReply,
  onSubmitReply
}: ReelsCommentItemProps) {
  const isReplying = activeReplyId === comment.id;

  return (
    <article className="space-y-3 border-b border-[#e5e7eb] pb-4">
      <CommentRow
        authorAvatarUrl={comment.authorAvatarUrl}
        authorLabel={comment.authorLabel}
        content={comment.content}
        createdAt={comment.createdAt}
        extraLabel={comment.isPinned ? "Đã ghim" : null}
        isLiked={comment.isLiked}
        likeCount={comment.likeCount}
        onLike={() => onLike(comment.id)}
      />

      <div className="ml-[3.25rem] flex flex-wrap items-center gap-3 text-[0.76rem] font-medium text-[#6b7280]">
        <button className="tap-highlight hover:text-[#111827]" onClick={() => onReply(comment.id)} type="button">
          Trả lời
        </button>
        {comment.replyCount > 0 ? <span>{comment.replyCount} phản hồi</span> : null}
        {comment.canPin ? (
          <button
            className="tap-highlight inline-flex items-center gap-1 hover:text-[#111827]"
            onClick={() => onPin(comment.id, !comment.isPinned)}
            type="button"
          >
            <PinIcon />
            <span>{comment.isPinned ? "Bỏ ghim" : "Ghim"}</span>
          </button>
        ) : null}
      </div>

      {isReplying ? (
        <div className="ml-[3.25rem]">
          <ReelsCommentInput
            disabled={isSubmitting}
            onSubmit={(content) => onSubmitReply(comment.id, content)}
            placeholder="Viết phản hồi..."
            submitLabel="Trả lời"
          />
        </div>
      ) : null}

      {comment.replies.length > 0 ? (
        <div className="ml-[3.25rem] space-y-3 border-l border-[#e5e7eb] pl-3">
          {comment.replies.map((reply) => (
            <CommentRow
              authorAvatarUrl={reply.authorAvatarUrl}
              authorLabel={reply.authorLabel}
              content={reply.content}
              createdAt={reply.createdAt}
              isLiked={reply.isLiked}
              key={reply.id}
              likeCount={reply.likeCount}
              onLike={() => onLike(reply.id)}
            />
          ))}
        </div>
      ) : null}
    </article>
  );
}
