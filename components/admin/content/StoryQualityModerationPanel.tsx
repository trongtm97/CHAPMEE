"use client";

import { useState, useTransition } from "react";
import { Button, Card } from "@/components/ui";
import {
  confirmStoryLowQualityAction,
  restoreStoryQualityAction
} from "@/lib/admin/content-quality-moderation-actions";

type StoryQualityModerationPanelProps = {
  storyId: string;
  storyTitle: string;
};

export function StoryQualityModerationPanel({
  storyId,
  storyTitle
}: StoryQualityModerationPanelProps) {
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleConfirmLow() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await confirmStoryLowQualityAction({
        moderatorNote: note,
        storyId
      });

      if (!result.ok) {
        setError(result.error ?? "Không xác nhận được.");
        return;
      }

      setMessage(
        `Đã ghi nhận chất lượng thấp (lần ${result.attempt}). Trạng thái: ${result.status}.`
      );
    });
  }

  function handleRestore() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await restoreStoryQualityAction({
        moderatorNote: note,
        storyId
      });

      if (!result.ok) {
        setError(result.error ?? "Không khôi phục được.");
        return;
      }

      setMessage("Đã khôi phục trạng thái chất lượng truyện.");
    });
  }

  return (
    <Card className="space-y-3 border-amber-400/20">
      <div>
        <p className="text-sm font-bold text-white">Chất lượng nội dung</p>
        <p className="mt-1 text-xs text-zinc-500">
          Xác nhận thủ công cho «{storyTitle}». Hệ thống không tự phạt chỉ vì ít
          báo cáo/đánh giá.
        </p>
      </div>
      <textarea
        className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
        onChange={(event) => setNote(event.target.value)}
        placeholder="Ghi chú moderator (tuỳ chọn)"
        rows={3}
        value={note}
      />
      <div className="flex flex-wrap gap-2">
        <Button disabled={pending} onClick={handleConfirmLow} type="button">
          Xác nhận chất lượng thấp
        </Button>
        <Button
          disabled={pending}
          onClick={handleRestore}
          type="button"
          variant="secondary"
        >
          Khôi phục chất lượng
        </Button>
      </div>
      {message ? <p className="text-sm text-emerald-300">{message}</p> : null}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
    </Card>
  );
}
