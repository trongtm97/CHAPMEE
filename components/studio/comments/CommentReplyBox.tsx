"use client";

import { useState, useTransition } from "react";
import { Textarea } from "@/components/ui";
import { studioReplyCommentAction } from "@/lib/studio/studio-comments-actions";
import {
  commentsBtnCompactPrimary,
  commentsBtnCompactSecondary
} from "@/components/studio/comments/shared/styles";

const QUICK_REPLIES = [
  "Cảm ơn bạn đã đọc truyện.",
  "Mình sẽ xem lại chương này.",
  "Cảm ơn góp ý của bạn, mình ghi nhận nhé."
];

type CommentReplyBoxProps = {
  commentId: string;
  onReplied?: () => void;
};

export function CommentReplyBox({ commentId, onReplied }: CommentReplyBoxProps) {
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const trimmed = content.trim();
    if (!trimmed) {
      setError("Nhập nội dung trả lời.");
      return;
    }

    startTransition(async () => {
      const result = await studioReplyCommentAction(commentId, trimmed);

      if (!result.ok) {
        setError(result.error ?? "Không gửi được phản hồi.");
        return;
      }

      setContent("");
      onReplied?.();
    });
  }

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      <div className="flex flex-wrap gap-1.5">
        {QUICK_REPLIES.map((template) => (
          <button
            className={commentsBtnCompactSecondary}
            disabled={isPending}
            key={template}
            onClick={() => setContent(template)}
            type="button"
          >
            {template.length > 28 ? `${template.slice(0, 28)}…` : template}
          </button>
        ))}
      </div>

      <Textarea
        aria-label="Nội dung trả lời"
        disabled={isPending}
        onChange={(event) => setContent(event.target.value)}
        placeholder="Viết phản hồi cho độc giả..."
        rows={4}
        value={content}
      />

      {error ? <p className="text-xs text-rose-300">{error}</p> : null}

      <button
        className={commentsBtnCompactPrimary}
        disabled={isPending || !content.trim()}
        type="submit"
      >
        {isPending ? "Đang gửi..." : "Trả lời"}
      </button>
    </form>
  );
}
