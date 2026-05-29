"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { QUALITY_REASON_FILTER_OPTIONS } from "@/lib/admin/content-quality-labels";
import type { ContentQualityReasonCode } from "@/types/content-quality";

export type ContentQualityActionKind =
  | "request_changes"
  | "restore"
  | "hide_temp"
  | "permanent_hide"
  | "disable_monetization";

type ContentQualityActionModalProps = {
  open: boolean;
  action: ContentQualityActionKind;
  attemptCount: number;
  maxAttempts: number;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (payload: {
    reasonCodes: ContentQualityReasonCode[];
    note: string;
  }) => void;
};

export function ContentQualityActionModal({
  open,
  action,
  attemptCount,
  maxAttempts,
  loading,
  onClose,
  onConfirm
}: ContentQualityActionModalProps) {
  const [reasonCode, setReasonCode] = useState<ContentQualityReasonCode>(
    "moderator_confirmed_low_quality"
  );
  const [note, setNote] = useState("");

  if (!open) return null;

  const title =
    action === "request_changes"
      ? "Yêu cầu tác giả sửa"
      : action === "restore"
        ? "Khôi phục nội dung"
        : action === "hide_temp"
          ? "Ẩn tạm khỏi public"
          : action === "permanent_hide"
            ? "Ẩn vĩnh viễn"
            : "Tắt kiếm tiền";

  const needsReason = action === "request_changes";
  const warnPermanent =
    action === "permanent_hide" &&
    (attemptCount >= maxAttempts || attemptCount >= 3);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
      <div className="w-full max-w-md space-y-4 rounded-xl border border-zinc-700 bg-zinc-900 p-5">
        <h2 className="text-lg font-semibold text-white">{title}</h2>

        {action === "permanent_hide" ? (
          <p className="text-sm text-amber-200">
            Thao tác này sẽ ẩn nội dung khỏi public và tắt kiếm tiền cho nội dung này. Dữ liệu
            vẫn được giữ trong hệ thống.
            {warnPermanent ? " (Đủ điều kiện lần 3/3)" : ""}
          </p>
        ) : null}

        {needsReason ? (
          <label className="block space-y-1">
            <span className="text-xs text-zinc-400">Lý do chất lượng</span>
            <select
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200"
              onChange={(e) => setReasonCode(e.target.value as ContentQualityReasonCode)}
              value={reasonCode}
            >
              {QUALITY_REASON_FILTER_OPTIONS.filter((o) => o.code !== "all").map((o) => (
                <option key={o.code} value={o.code}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="block space-y-1">
          <span className="text-xs text-zinc-400">
            {action === "request_changes"
              ? "Hướng dẫn sửa cho tác giả (bắt buộc)"
              : "Ghi chú moderator (bắt buộc)"}
          </span>
          <textarea
            className="min-h-[100px] w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200"
            onChange={(e) => setNote(e.target.value)}
            placeholder="Mô tả rõ cần sửa gì hoặc lý do quyết định..."
            value={note}
          />
        </label>

        <div className="flex justify-end gap-2">
          <Button disabled={loading} onClick={onClose} type="button" variant="ghost">
            Huỷ
          </Button>
          <Button
            disabled={loading || note.trim().length < 5}
            onClick={() =>
              onConfirm({
                reasonCodes: needsReason ? [reasonCode] : [],
                note: note.trim()
              })
            }
            type="button"
            variant={action === "permanent_hide" ? "danger" : "primary"}
          >
            {loading ? "Đang lưu…" : "Xác nhận"}
          </Button>
        </div>
      </div>
    </div>
  );
}
