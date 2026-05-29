"use client";

import { useState } from "react";
import { Button, Input, Textarea } from "@/components/ui";

type BanUserDialogProps = {
  open: boolean;
  userLabel: string;
  disabled?: boolean;
  onClose: () => void;
  onConfirm: (input: { reason: string; endsAt: string | null }) => void;
};

export function BanUserDialog({
  open,
  userLabel,
  disabled,
  onClose,
  onConfirm
}: BanUserDialogProps) {
  const [reason, setReason] = useState("");
  const [durationDays, setDurationDays] = useState("");
  const [permanent, setPermanent] = useState(true);

  if (!open) return null;

  function handleSubmit() {
    const trimmed = reason.trim();
    if (!trimmed) return;

    let endsAt: string | null = null;
    if (!permanent && durationDays.trim()) {
      const days = Number(durationDays);
      if (Number.isFinite(days) && days > 0) {
        const end = new Date();
        end.setDate(end.getDate() + days);
        endsAt = end.toISOString();
      }
    }

    onConfirm({ reason: trimmed, endsAt });
    setReason("");
    setDurationDays("");
    setPermanent(true);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md space-y-4 rounded-xl border border-zinc-700 bg-zinc-900 p-5">
        <div>
          <h3 className="text-lg font-semibold text-white">Ban người dùng</h3>
          <p className="mt-1 text-sm text-zinc-400">{userLabel}</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm text-zinc-300" htmlFor="ban-reason">
            Lý do <span className="text-red-400">*</span>
          </label>
          <Textarea
            id="ban-reason"
            placeholder="Mô tả lý do ban..."
            rows={3}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input
            checked={permanent}
            type="checkbox"
            onChange={(event) => setPermanent(event.target.checked)}
          />
          Ban vĩnh viễn (không có ngày hết hạn)
        </label>

        {!permanent ? (
          <div className="space-y-2">
            <label className="text-sm text-zinc-300" htmlFor="ban-days">
              Số ngày (tuỳ chọn)
            </label>
            <Input
              id="ban-days"
              min={1}
              placeholder="30"
              type="number"
              value={durationDays}
              onChange={(event) => setDurationDays(event.target.value)}
            />
          </div>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button disabled={disabled} onClick={onClose} type="button" variant="ghost">
            Huỷ
          </Button>
          <Button
            disabled={disabled || !reason.trim()}
            onClick={handleSubmit}
            type="button"
            variant="danger"
          >
            Xác nhận ban
          </Button>
        </div>
      </div>
    </div>
  );
}
