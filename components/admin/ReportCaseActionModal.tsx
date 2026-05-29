"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import {
  REPORT_DISMISS_REASON_OPTIONS,
  REPORT_RESOLVE_OPTIONS
} from "@/lib/admin/report-labels";
import type { ReportCaseActionKind, ReportResolutionCode } from "@/types/reports";

type ReportCaseActionModalProps = {
  open: boolean;
  action: ReportCaseActionKind;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (payload: {
    resolutionCode: ReportResolutionCode | null;
    note: string;
  }) => void;
};

export function ReportCaseActionModal({
  open,
  action,
  loading,
  onClose,
  onConfirm
}: ReportCaseActionModalProps) {
  const [resolutionCode, setResolutionCode] = useState<ReportResolutionCode>("no_violation");
  const [note, setNote] = useState("");

  if (!open) return null;

  const needsResolution = action === "dismiss" || action === "resolve";
  const options =
    action === "dismiss" ? REPORT_DISMISS_REASON_OPTIONS : REPORT_RESOLVE_OPTIONS;

  const title =
    action === "assign"
      ? "Nhận xử lý"
      : action === "dismiss"
        ? "Bỏ qua / từ chối báo cáo"
        : action === "hide_content"
          ? "Ẩn nội dung"
          : action === "warn_user"
            ? "Cảnh báo người vi phạm"
            : action === "escalate"
              ? "Chuyển cấp xử lý"
              : "Xử lý báo cáo";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
      <div className="w-full max-w-md space-y-4 rounded-xl border border-zinc-700 bg-zinc-900 p-5">
        <h2 className="text-lg font-semibold text-white">{title}</h2>

        {needsResolution ? (
          <label className="block space-y-1">
            <span className="text-xs text-zinc-400">Kết quả xử lý</span>
            <select
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200"
              onChange={(e) => setResolutionCode(e.target.value as ReportResolutionCode)}
              value={resolutionCode}
            >
              {options.map((o) => (
                <option key={o.code} value={o.code}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="block space-y-1">
          <span className="text-xs text-zinc-400">
            Ghi chú moderator {action === "assign" ? "(tuỳ chọn)" : "(bắt buộc)"}
          </span>
          <textarea
            className="min-h-[100px] w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200"
            onChange={(e) => setNote(e.target.value)}
            placeholder="Mô tả quyết định xử lý..."
            value={note}
          />
        </label>

        <div className="flex justify-end gap-2">
          <Button disabled={loading} onClick={onClose} type="button" variant="ghost">
            Huỷ
          </Button>
          <Button
            disabled={loading || (action !== "assign" && note.trim().length < 5)}
            onClick={() =>
              onConfirm({
                resolutionCode: needsResolution ? resolutionCode : null,
                note: note.trim()
              })
            }
            type="button"
            variant={action === "dismiss" ? "danger" : "primary"}
          >
            {loading ? "Đang lưu…" : "Xác nhận"}
          </Button>
        </div>
      </div>
    </div>
  );
}
