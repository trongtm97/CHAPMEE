"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { StudioStoriesConfirmModal } from "@/components/studio/stories/StudioStoriesConfirmModal";
import { bulkDeleteStudioDraftsAction } from "@/lib/studio/draft-actions";
import {
  draftsBtnCompactPrimary,
  draftsBtnCompactSecondary,
  draftsBtnDanger,
  draftsBtnGhost
} from "@/components/studio/drafts/shared/styles";
import type { DraftItem } from "@/types/drafts";

type StudioDraftsBulkBarProps = {
  count: number;
  drafts: DraftItem[];
  onClear: () => void;
  onTogglePriority: (draftIds: string[]) => void;
  selectedIds: string[];
};

function downloadDraftListCsv(drafts: DraftItem[]) {
  const header = ["Loại", "Tiêu đề", "Truyện", "Cập nhật", "Số từ"];
  const rows = drafts.map((draft) => [
    draft.type,
    `"${draft.title.replace(/"/g, '""')}"`,
    `"${(draft.parentStoryTitle ?? "").replace(/"/g, '""')}"`,
    draft.updatedAt,
    String(draft.wordCount)
  ]);

  const csv = [header.join(","), ...rows.map((row) => row.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `chapmee-nhap-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function StudioDraftsBulkBar({
  count,
  drafts,
  onClear,
  onTogglePriority,
  selectedIds
}: StudioDraftsBulkBarProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  if (count === 0) {
    return null;
  }

  const selectedDrafts = drafts.filter((draft) => selectedIds.includes(draft.id));
  const canPublishAll = selectedDrafts.length > 0 && selectedDrafts.every((d) => d.canPublish);
  const canScheduleAll =
    selectedDrafts.length > 0 && selectedDrafts.every((d) => d.canSchedule);

  function handleDelete() {
    startTransition(async () => {
      const result = await bulkDeleteStudioDraftsAction(selectedIds);

      if (!result.ok) {
        setToast(result.error ?? "Không xóa được nháp.");
        return;
      }

      setToast(`Đã xóa ${result.successCount} nháp.`);
      onClear();
      setDeleteOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <div className="sticky bottom-0 z-30 -mx-1 border-t border-white/10 bg-zinc-950/95 px-1 py-3 backdrop-blur sm:static sm:mx-0 sm:rounded-xl sm:border sm:px-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-white">
            Đã chọn {count} nháp
          </p>
          <div className="flex flex-wrap gap-1.5">
            <button className={draftsBtnGhost} onClick={onClear} type="button">
              Bỏ chọn
            </button>
            <button
              className={draftsBtnCompactSecondary}
              disabled={isPending}
              onClick={() => onTogglePriority(selectedIds)}
              title="Lưu ưu tiên trên thiết bị này"
              type="button"
            >
              Đánh dấu ưu tiên
            </button>
            <button
              className={draftsBtnCompactSecondary}
              disabled={!canPublishAll}
              onClick={() =>
                setToast(
                  canPublishAll
                    ? "Xuất bản hàng loạt đang phát triển."
                    : "Chỉ xuất bản những nháp đủ điều kiện."
                )
              }
              title={
                canPublishAll
                  ? undefined
                  : "Chỉ xuất bản những nháp đủ điều kiện."
              }
              type="button"
            >
              Xuất bản
            </button>
            <button
              className={draftsBtnCompactSecondary}
              disabled={!canScheduleAll}
              onClick={() =>
                setToast(
                  canScheduleAll
                    ? "Chuyển vào lịch đăng đang phát triển."
                    : "Chỉ lên lịch những nháp đủ điều kiện."
                )
              }
              title={
                canScheduleAll
                  ? undefined
                  : "Chỉ lên lịch những nháp đủ điều kiện."
              }
              type="button"
            >
              Lịch đăng
            </button>
            <button
              className={draftsBtnCompactPrimary}
              onClick={() => downloadDraftListCsv(selectedDrafts)}
              type="button"
            >
              Xuất danh sách
            </button>
            <button
              className={draftsBtnDanger}
              disabled={isPending}
              onClick={() => setDeleteOpen(true)}
              type="button"
            >
              Xoá nháp
            </button>
          </div>
        </div>
        {toast ? <p className="mt-2 text-xs text-zinc-400">{toast}</p> : null}
      </div>

      <StudioStoriesConfirmModal
        confirmLabel="Xoá nháp"
        description={`Bạn có chắc muốn xoá ${count} nháp đã chọn? Hành động này không thể hoàn tác.`}
        destructive
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        open={deleteOpen}
        title="Xoá nháp hàng loạt?"
      />
    </>
  );
}
