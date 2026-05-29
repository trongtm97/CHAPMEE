"use client";

import { useState } from "react";
import { Button, Input } from "@/components/ui";
import type { AdminRefundListRow } from "@/types/admin-refund";
import type { RefundRowAction } from "@/components/admin/refunds/RefundTable";
import { formatCoin, formatRefundId } from "@/lib/admin/refunds/refund-labels";

export type RefundModalState = {
  action: RefundRowAction;
  row: AdminRefundListRow;
} | null;

type Props = {
  modal: RefundModalState;
  pending?: boolean;
  onClose: () => void;
  onConfirm: (payload: { reason?: string; internalNote?: string }) => void;
};

const TITLES: Record<RefundRowAction, string> = {
  detail: "Chi tiết",
  approve: "Xác nhận duyệt hoàn tiền",
  reject: "Từ chối hoàn tiền",
  processing: "Đánh dấu đang xử lý",
  complete: "Xác nhận hoàn tất hoàn tiền",
  failed: "Đánh dấu hoàn tiền thất bại"
};

export function RefundActionModals({ modal, pending, onClose, onConfirm }: Props) {
  const [reason, setReason] = useState("");
  const [internalNote, setInternalNote] = useState("");

  if (!modal || modal.action === "detail") return null;

  const isDanger =
    modal.action === "reject" || modal.action === "failed" || modal.action === "complete";

  function handleConfirm() {
    onConfirm({
      reason: reason.trim() || undefined,
      internalNote: internalNote.trim() || undefined
    });
    setReason("");
    setInternalNote("");
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        aria-label="Đóng"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        type="button"
      />
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#0b1016] p-5 shadow-2xl">
        <h3 className="text-lg font-semibold text-white">{TITLES[modal.action]}</h3>
        <p className="mt-1 font-mono text-sm text-cyan-300">{formatRefundId(modal.row.refundId)}</p>

        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm">
          <p className="text-zinc-400">Số coin hoàn</p>
          <p className="text-lg font-bold text-white">{formatCoin(modal.row.coinAmount)}</p>
          <p className="mt-2 text-zinc-400">Người mua</p>
          <p className="text-zinc-200">{modal.row.buyerUsername ? `@${modal.row.buyerUsername}` : "—"}</p>
          {modal.row.contentLabel ? (
            <>
              <p className="mt-2 text-zinc-400">Nội dung</p>
              <p className="text-zinc-200">{modal.row.contentLabel}</p>
            </>
          ) : null}
        </div>

        <div className="mt-4 space-y-3">
          {modal.action === "reject" || modal.action === "failed" ? (
            <Input
              label={modal.action === "reject" ? "Lý do từ chối" : "Lý do thất bại"}
              onChange={(e) => setReason(e.target.value)}
              required
              value={reason}
            />
          ) : null}
          <Input
            label="Ghi chú nội bộ (tuỳ chọn)"
            onChange={(e) => setInternalNote(e.target.value)}
            value={internalNote}
          />
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button onClick={onClose} type="button" variant="secondary">
            Huỷ
          </Button>
          <Button
            loading={pending}
            onClick={handleConfirm}
            type="button"
            variant={isDanger ? "danger" : "primary"}
          >
            Xác nhận
          </Button>
        </div>
      </div>
    </div>
  );
}
