"use client";

import { useActionState } from "react";
import { Button, Textarea } from "@/components/ui";
import {
  createCommentAction,
  type CommentFormState
} from "@/lib/comments/createComment";

type CommentFormProps = {
  storyId: string;
  episodeId?: string | null;
  returnTo: string;
};

const initialState: CommentFormState = {
  error: null
};

export function CommentForm({
  episodeId,
  returnTo,
  storyId
}: CommentFormProps) {
  const [state, formAction, isPending] = useActionState(
    createCommentAction,
    initialState
  );

  return (
    <form action={formAction} className="space-y-3">
      <input name="storyId" type="hidden" value={storyId} />
      <input name="episodeId" type="hidden" value={episodeId ?? ""} />
      <input name="returnTo" type="hidden" value={returnTo} />
      <Textarea
        label="Viết bình luận"
        maxLength={500}
        name="content"
        placeholder="Chia sẻ cảm nhận của bạn..."
        required
        rows={3}
      />
      {state.error ? (
        <p className="rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">
          {state.error}
        </p>
      ) : null}
      <Button className="w-full" loading={isPending} type="submit">
        Gửi bình luận
      </Button>
    </form>
  );
}
