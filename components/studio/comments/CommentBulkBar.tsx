"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { StudioStoriesConfirmModal } from "@/components/studio/stories/StudioStoriesConfirmModal";
import {
  bulkHideCommentsAction,
  bulkPinCommentsAction,
  bulkUnhideCommentsAction
} from "@/lib/studio/comments-bulk-actions";
import {
  commentsBtnCompactSecondary,
  commentsBtnDanger,
  commentsBtnGhost
} from "@/components/studio/comments/shared/styles";

type CommentBulkBarProps = {
  count: number;
  onClear: () => void;
  onSelectPage: () => void;
  selectedIds: string[];
};

type ConfirmKind = "hide" | null;

export function CommentBulkBar({
  count,
  onClear,
  onSelectPage,
  selectedIds
}: CommentBulkBarProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmKind, setConfirmKind] = useState<ConfirmKind>(null);
  const [toast, setToast] = useState<string | null>(null);

  if (count === 0) {
    return null;
  }

  function run(
    label: string,
    action: () => Promise<{
      error?: string;
      failedCount: number;
      ok: boolean;
      successCount: number;
    }>
  ) {
    startTransition(async () => {
      const result = await action();

      if (!result.ok) {
        setToast(result.error ?? `${label} thất bại.`);
        return;
      }

      setToast(`${label}: ${result.successCount} bình luận.`);
      onClear();
      router.refresh();
    });
  }

  return (
    <>
      <div className="fixed inset-x-0 bottom-16 z-40 border-t border-white/10 bg-zinc-950/95 px-4 py-3 backdrop-blur sm:bottom-0 lg:sticky lg:inset-x-auto lg:bottom-auto lg:rounded-xl lg:border lg:px-3">
        <div className="flex w-full min-w-0 flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-white">Đã chọn {count} bình luận</p>
            <button className={commentsBtnGhost} onClick={onSelectPage} type="button">
              Chọn trang này
            </button>
            <button className={commentsBtnGhost} onClick={onClear} type="button">
              Bỏ chọn
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button
              className={commentsBtnCompactSecondary}
              disabled
              title="Trả lời từng bình luận để tự động đánh dấu đã trả lời"
              type="button"
            >
              Đã trả lời
            </button>
            <button
              className={commentsBtnCompactSecondary}
              disabled={isPending}
              onClick={() => run("Đã ghim", () => bulkPinCommentsAction(selectedIds, true))}
              type="button"
            >
              Ghim
            </button>
            <button
              className={commentsBtnCompactSecondary}
              disabled={isPending}
              onClick={() => run("Đã bỏ ghim", () => bulkPinCommentsAction(selectedIds, false))}
              type="button"
            >
              Bỏ ghim
            </button>
            <button
              className={commentsBtnCompactSecondary}
              disabled={isPending}
              onClick={() => run("Đã bỏ ẩn", () => bulkUnhideCommentsAction(selectedIds))}
              type="button"
            >
              Bỏ ẩn
            </button>
            <button
              className={commentsBtnDanger}
              disabled={isPending}
              onClick={() => setConfirmKind("hide")}
              type="button"
            >
              Ẩn
            </button>
            <button
              className={commentsBtnCompactSecondary}
              disabled
              title="Chưa có API xóa bình luận hàng loạt"
              type="button"
            >
              Xóa
            </button>
          </div>
        </div>

        {toast ? <p className="mt-2 text-xs text-zinc-400">{toast}</p> : null}
      </div>

      <StudioStoriesConfirmModal
        confirmLabel="Ẩn"
        description={`${count} bình luận sẽ bị ẩn khỏi trang công khai.`}
        onClose={() => setConfirmKind(null)}
        onConfirm={() => {
          setConfirmKind(null);
          run("Đã ẩn", () => bulkHideCommentsAction(selectedIds));
        }}
        open={confirmKind === "hide"}
        title="Ẩn bình luận đã chọn?"
        destructive
      />
    </>
  );
}
