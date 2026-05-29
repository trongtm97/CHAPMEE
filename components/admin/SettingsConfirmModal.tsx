"use client";

import { useEffect, useState } from "react";
import { Button, Input } from "@/components/ui";
import type { DraftSettingChange, RiskLevel } from "@/lib/admin/monetization";

const RISK_LABEL: Record<RiskLevel, string> = {
  low: "Thấp",
  medium: "Trung bình",
  high: "Cao"
};

const RISK_CLASS: Record<RiskLevel, string> = {
  low: "border-zinc-600 text-zinc-400",
  medium: "border-amber-500/40 text-amber-200",
  high: "border-red-500/40 text-red-200"
};

type SettingsConfirmModalProps = {
  open: boolean;
  changes: DraftSettingChange[];
  reason: string;
  pending?: boolean;
  onReasonChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
};

export function SettingsConfirmModal({
  open,
  changes,
  reason,
  pending,
  onReasonChange,
  onConfirm,
  onCancel
}: SettingsConfirmModalProps) {
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    if (open) {
      setAcknowledged(false);
    }
  }, [open]);

  if (!open) return null;

  const canConfirm =
    reason.trim().length >= 3 && acknowledged && changes.length > 0 && !pending;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-settings-title"
    >
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-white/10 bg-zinc-950 p-5 shadow-xl">
        <h2 id="confirm-settings-title" className="text-lg font-semibold text-white">
          Xác nhận lưu cấu hình
        </h2>

        <div className="mt-3 space-y-2 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-3 text-xs leading-5 text-amber-100/90">
          <p>Thay đổi này có thể ảnh hưởng giao dịch mới sau khi lưu.</p>
          <p>Giao dịch cũ không được tính lại.</p>
          <p>Vui lòng nhập lý do thay đổi trước khi lưu.</p>
        </div>

        <ul className="mt-4 max-h-64 space-y-2 overflow-y-auto">
          {changes.map((change) => (
            <li
              key={change.key}
              className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-white">{change.label}</p>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${RISK_CLASS[change.riskLevel]}`}
                >
                  Rủi ro: {RISK_LABEL[change.riskLevel]}
                </span>
              </div>
              <p className="mt-1 text-zinc-400">
                <span className="text-zinc-500">Cũ:</span> {change.oldValue}
                {" → "}
                <span className="text-zinc-500">Mới:</span>{" "}
                <span className="text-cyan-200">{change.newValue}</span>
              </p>
            </li>
          ))}
        </ul>

        <label className="mt-4 block text-sm">
          <span className="text-zinc-300">Lý do thay đổi *</span>
          <Input
            className="mt-1.5"
            placeholder="Ví dụ: Điều chỉnh tỷ giá theo chính sách Q2…"
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
          />
        </label>

        <label className="mt-3 flex cursor-pointer items-start gap-2 text-sm text-zinc-300">
          <input
            checked={acknowledged}
            className="mt-1"
            onChange={(e) => setAcknowledged(e.target.checked)}
            type="checkbox"
          />
          <span>Tôi hiểu thay đổi này chỉ áp dụng cho giao dịch mới.</span>
        </label>

        <div className="mt-5 flex flex-wrap gap-2">
          <Button disabled={!canConfirm} onClick={onConfirm} type="button" variant="primary">
            {pending ? "Đang lưu…" : "Xác nhận lưu"}
          </Button>
          <Button disabled={pending} onClick={onCancel} type="button" variant="secondary">
            Hủy
          </Button>
        </div>
      </div>
    </div>
  );
}
