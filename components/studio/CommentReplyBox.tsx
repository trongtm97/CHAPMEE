"use client";

import { useState, useTransition } from "react";
import { Button, Textarea } from "@/components/ui";
import { studioReplyCommentAction } from "@/lib/studio/studio-comments-actions";

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
    <form className="space-y-2" onSubmit={handleSubmit}>
      <Textarea
        disabled={isPending}
        onChange={(event) => setContent(event.target.value)}
        placeholder="Viết phản hồi cho độc giả..."
        rows={3}
        value={content}
      />
      {error ? <p className="text-xs text-rose-300">{error}</p> : null}
      <Button disabled={isPending || !content.trim()} type="submit" variant="primary">
        {isPending ? "Đang gửi..." : "Trả lời"}
      </Button>
    </form>
  );
}
