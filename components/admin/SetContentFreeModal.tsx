"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { setContentFreeDueToQualityAction } from "@/lib/admin/quality-monetization-actions";
import { FREE_ACCESS_REASON_LABELS } from "@/lib/admin/quality-refund-constants";
import type { FreeAccessReason } from "@/types/quality-refund";

type SetContentFreeModalProps = {
  open: boolean;
  storyId: string;
  storyTitle: string;
  buyerCount: number;
  currentStatusLabel: string;
  onClose: () => void;
  onSuccess: (message: string) => void;
};

export function SetContentFreeModal({
  open,
  storyId,
  storyTitle,
  buyerCount,
  currentStatusLabel,
  onClose,
  onSuccess
}: SetContentFreeModalProps) {
  const [reason, setReason] = useState<FreeAccessReason>("quality_low");
  const [authorNote, setAuthorNote] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [notifyAuthor, setNotifyAuthor] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) return null;

  function handleConfirm() {
    setError(null);
    if (!authorNote.trim()) {
      setError("Vui lòng nhập ghi chú cho tác giả.");
      return;
    }

    startTransition(async () => {
      const result = await setContentFreeDueToQualityAction({
        storyId,
        reason,
        authorNote: authorNote.trim(),
        adminNote: adminNote.trim() || null,
        notifyAuthor
      });

      if (!result.ok) {
        setError(result.error ?? "Không thể mở miễn phí.");
        return;
      }

      onSuccess("Đã mở miễn phí nội dung do chất lượng.");
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg rounded-xl border border-white/10 bg-[#0c1118] p-5 shadow-2xl">
        <h3 className="text-lg font-bold text-white">Mở miễn phí nội dung</h3>
        <p className="mt-2 text-sm text-zinc-400">
          <strong className="text-zinc-200">{storyTitle}</strong> · Trạng thái hiện tại:{" "}
          {currentStatusLabel}
        </p>
        <p className="mt-1 text-sm text-zinc-500">
          Người đã mua: {buyerCount}. Nội dung sẽ được xem miễn phí từ thời điểm xác nhận.
        </p>

        <label className="mt-4 block text-sm text-zinc-300">
          Lý do
          <select
            className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm"
            onChange={(e) => setReason(e.target.value as FreeAccessReason)}
            value={reason}
          >
            {Object.entries(FREE_ACCESS_REASON_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="mt-3 block text-sm text-zinc-300">
          Ghi chú cho tác giả (hiển thị trong Studio)
          <textarea
            className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm"
            onChange={(e) => setAuthorNote(e.target.value)}
            rows={3}
            value={authorNote}
          />
        </label>

        <label className="mt-3 block text-sm text-zinc-300">
          Ghi chú nội bộ (admin)
          <textarea
            className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm"
            onChange={(e) => setAdminNote(e.target.value)}
            rows={2}
            value={adminNote}
          />
        </label>

        <label className="mt-3 flex items-center gap-2 text-sm text-zinc-300">
          <input
            checked={notifyAuthor}
            onChange={(e) => setNotifyAuthor(e.target.checked)}
            type="checkbox"
          />
          Gửi thông báo cho tác giả
        </label>

        {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}

        <div className="mt-5 flex justify-end gap-2">
          <Button disabled={pending} onClick={onClose} type="button" variant="ghost">
            Hủy
          </Button>
          <Button disabled={pending} onClick={handleConfirm} type="button">
            Xác nhận mở miễn phí
          </Button>
        </div>
      </div>
    </div>
  );
}
