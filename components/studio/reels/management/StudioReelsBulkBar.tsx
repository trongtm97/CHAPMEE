"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { StudioStoriesConfirmModal } from "@/components/studio/stories/StudioStoriesConfirmModal";
import {
  bulkDeleteReelsAction,
  bulkHideReelsAction,
  bulkMoveReelsToDraftAction,
  bulkUnhideReelsAction,
  exportReelsCsvAction
} from "@/lib/reels/reels-bulk-actions";
import {
  reelsBtnCompactPrimary,
  reelsBtnCompactSecondary,
  reelsBtnDanger,
  reelsBtnGhost
} from "@/components/studio/reels/management/shared/styles";

type StudioReelsBulkBarProps = {
  count: number;
  onClear: () => void;
  onSelectPage: () => void;
  selectedIds: string[];
};

export function StudioReelsBulkBar({
  count,
  onClear,
  onSelectPage,
  selectedIds
}: StudioReelsBulkBarProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  if (count === 0) {
    return null;
  }

  function downloadCsv(csv: string) {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `chapmee-reels-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
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

      setToast(`${label} ${result.successCount} Reels.`);
      onClear();
      router.refresh();
    });
  }

  return (
    <>
      <div className="sticky bottom-0 z-30 -mx-1 border-t border-white/10 bg-zinc-950/95 px-1 py-3 backdrop-blur lg:static lg:mx-0 lg:rounded-xl lg:border lg:px-3">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-white">Đã chọn {count} Reels</p>
            <button className={reelsBtnGhost} onClick={onSelectPage} type="button">
              Chọn trang này
            </button>
            <button className={reelsBtnGhost} onClick={onClear} type="button">
              Bỏ chọn
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              className={reelsBtnCompactSecondary}
              disabled={isPending}
              onClick={() => run("Đã ẩn", () => bulkHideReelsAction(selectedIds))}
              type="button"
            >
              Ẩn
            </button>
            <button
              className={reelsBtnCompactSecondary}
              disabled={isPending}
              onClick={() => run("Đã hiện", () => bulkUnhideReelsAction(selectedIds))}
              type="button"
            >
              Hiện lại
            </button>
            <button
              className={reelsBtnCompactSecondary}
              disabled={isPending}
              onClick={() =>
                run("Chuyển nháp", () => bulkMoveReelsToDraftAction(selectedIds))
              }
              type="button"
            >
              Về nháp
            </button>
            <button
              className={reelsBtnCompactSecondary}
              disabled={isPending}
              onClick={() =>
                setToast("Lên lịch hàng loạt đang chuẩn bị — hãy sửa từng Reels.")
              }
              type="button"
            >
              Lên lịch
            </button>
            <button
              className={reelsBtnCompactPrimary}
              disabled={isPending}
              onClick={() => {
                startTransition(async () => {
                  const result = await exportReelsCsvAction(selectedIds);
                  if (!result.csv) {
                    setToast(result.error ?? "Không xuất được.");
                    return;
                  }
                  downloadCsv(result.csv);
                  setToast("Đã xuất danh sách CSV.");
                });
              }}
              type="button"
            >
              Xuất CSV
            </button>
            <button
              className={reelsBtnDanger}
              disabled={isPending}
              onClick={() => setDeleteOpen(true)}
              type="button"
            >
              Xóa
            </button>
          </div>
        </div>
        {toast ? <p className="mt-2 text-xs text-zinc-400">{toast}</p> : null}
      </div>

      <StudioStoriesConfirmModal
        confirmLabel="Xóa nháp"
        description={`Chỉ xóa được Reels ở trạng thái nháp. Bạn có chắc muốn xoá trong ${count} mục đã chọn?`}
        destructive
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => {
          run("Đã xóa", () => bulkDeleteReelsAction(selectedIds));
          setDeleteOpen(false);
        }}
        open={deleteOpen}
        title="Xóa Reels đã chọn?"
      />
    </>
  );
}
