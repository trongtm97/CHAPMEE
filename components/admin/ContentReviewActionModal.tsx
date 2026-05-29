"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { CONTENT_REVIEW_REASON_OPTIONS } from "@/lib/admin/content-review-reasons";
import type { ContentReviewActionKind, ContentReviewReasonCode } from "@/types/admin-content-review";

type ContentReviewActionModalProps = {
  open: boolean;
  action: ContentReviewActionKind;
  title: string;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (payload: { reasonCode: ContentReviewReasonCode | null; note: string }) => void;
};

export function ContentReviewActionModal({
  open,
  action,
  title,
  loading,
  onClose,
  onConfirm
}: ContentReviewActionModalProps) {
  const [reasonCode, setReasonCode] = useState<ContentReviewReasonCode>("other");
  const [note, setNote] = useState("");

  if (!open) return null;

  const needsReason = action === "reject" || action === "request_changes";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
      <div className="w-full max-w-md space-y-4 rounded-xl border border-zinc-700 bg-zinc-900 p-5">
        <h2 className="text-lg font-semibold text-white">{title}</h2>

        {needsReason ? (
          <label className="block space-y-1">
            <span className="text-xs text-zinc-400">Lý do</span>
            <select
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200"
              onChange={(e) => setReasonCode(e.target.value as ContentReviewReasonCode)}
              value={reasonCode}
            >
              {CONTENT_REVIEW_REASON_OPTIONS.map((o) => (
                <option key={o.code} value={o.code}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="block space-y-1">
          <span className="text-xs text-zinc-400">
            {needsReason ? "Ghi chú cho tác giả (bắt buộc)" : "Ghi chú (tuỳ chọn)"}
          </span>
          <textarea
            className="min-h-[100px] w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200"
            onChange={(e) => setNote(e.target.value)}
            placeholder={
              action === "request_changes"
                ? "Mô tả rõ cần sửa gì..."
                : "Lý do từ chối..."
            }
            value={note}
          />
        </label>

        <div className="flex justify-end gap-2">
          <Button disabled={loading} onClick={onClose} type="button" variant="ghost">
            Huỷ
          </Button>
          <Button
            disabled={loading || (needsReason && note.trim().length < 5)}
            onClick={() =>
              onConfirm({
                reasonCode: needsReason ? reasonCode : null,
                note: note.trim()
              })
            }
            type="button"
            variant={action === "reject" ? "danger" : "primary"}
          >
            {loading ? "Đang lưu…" : "Xác nhận"}
          </Button>
        </div>
      </div>
    </div>
  );
}
