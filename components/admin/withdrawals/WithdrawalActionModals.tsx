"use client";

import { useState } from "react";
import { Button, Input } from "@/components/ui";
import type { WithdrawalAdminAction } from "@/types/admin-withdrawal";

export type WithdrawalModalState = {
  action: WithdrawalAdminAction;
  requestId: string;
  withdrawalCode: string;
} | null;

type Props = {
  modal: WithdrawalModalState;
  pending?: boolean;
  onClose: () => void;
  onConfirm: (payload: {
    rejectReason?: string;
    paymentReference?: string;
    paidAt?: string;
    adminNote?: string;
  }) => void;
};

const TITLES: Record<WithdrawalAdminAction, string> = {
  approve: "Xác nhận duyệt yêu cầu",
  reject: "Từ chối yêu cầu rút tiền",
  processing: "Đánh dấu đang xử lý",
  paid: "Đánh dấu đã thanh toán",
  failed: "Đánh dấu thất bại",
  risk_review: "Chuyển xem xét rủi ro",
  return_to_approved: "Trả về trạng thái đã duyệt",
  reopen: "Mở lại yêu cầu"
};

export function WithdrawalActionModals({ modal, pending, onClose, onConfirm }: Props) {
  const [rejectReason, setRejectReason] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [paidAt, setPaidAt] = useState("");
  const [adminNote, setAdminNote] = useState("");

  if (!modal) return null;

  const isDanger = modal.action === "reject" || modal.action === "failed";

  function handleConfirm() {
    onConfirm({
      rejectReason: rejectReason.trim() || undefined,
      paymentReference: paymentReference.trim() || undefined,
      paidAt: paidAt || undefined,
      adminNote: adminNote.trim() || undefined
    });
    setRejectReason("");
    setPaymentReference("");
    setPaidAt("");
    setAdminNote("");
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
        <p className="mt-1 text-sm text-zinc-400">Mã {modal.withdrawalCode}</p>

        <div className="mt-4 space-y-3">
          {modal.action === "reject" || modal.action === "failed" ? (
            <Input
              label={modal.action === "reject" ? "Lý do từ chối" : "Lý do thất bại"}
              onChange={(e) => setRejectReason(e.target.value)}
              required
              value={rejectReason}
            />
          ) : null}

          {modal.action === "paid" ? (
            <>
              <Input
                label="Mã tham chiếu thanh toán"
                onChange={(e) => setPaymentReference(e.target.value)}
                required
                value={paymentReference}
              />
              <label className="block space-y-1 text-sm">
                <span className="text-zinc-400">Ngày thanh toán</span>
                <input
                  className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-white"
                  onChange={(e) => setPaidAt(e.target.value)}
                  type="datetime-local"
                  value={paidAt}
                />
              </label>
            </>
          ) : null}

          {(modal.action === "paid" ||
            modal.action === "approve" ||
            modal.action === "processing") && (
            <Input
              label="Ghi chú admin"
              onChange={(e) => setAdminNote(e.target.value)}
              value={adminNote}
            />
          )}
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button onClick={onClose} type="button" variant="ghost">
            Hủy
          </Button>
          <Button
            disabled={pending}
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
