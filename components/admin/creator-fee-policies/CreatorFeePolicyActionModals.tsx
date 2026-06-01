"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import {
  pauseCreatorFeePolicyAction,
  revokeCreatorFeePolicyAction,
  resumeCreatorFeePolicyAction
} from "@/lib/admin/creator-fee-policies/policy-status-actions";
import type { CreatorFeePolicyModalState } from "@/types/admin-creator-fee-policy";

type Props = {
  modal: CreatorFeePolicyModalState;
  onClose: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
};

export function CreatorFeePolicyActionModals({ modal, onClose, onSuccess, onError }: Props) {
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();

  if (!modal) return null;

  const title =
    modal.type === "pause"
      ? "Tạm dừng chính sách"
      : modal.type === "revoke"
        ? "Thu hồi chính sách"
        : "Tiếp tục chính sách";

  function confirm() {
    if (!modal) return;
    startTransition(async () => {
      let result;
      if (modal.type === "pause") {
        result = await pauseCreatorFeePolicyAction(modal.policyId, reason);
      } else if (modal.type === "revoke") {
        result = await revokeCreatorFeePolicyAction(modal.policyId, reason);
      } else {
        result = await resumeCreatorFeePolicyAction(modal.policyId, reason);
      }

      if (!result.ok) {
        onError(result.error ?? "Thao tác thất bại.");
        return;
      }

      onSuccess(
        modal.type === "pause"
          ? "Đã tạm dừng chính sách."
          : modal.type === "revoke"
            ? "Đã thu hồi chính sách."
            : "Đã tiếp tục chính sách."
      );
      setReason("");
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-zinc-900 p-5 shadow-xl">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        {"policyName" in modal && modal.policyName ? (
          <p className="mt-1 text-sm text-zinc-400">{modal.policyName}</p>
        ) : null}
        <label className="mt-4 block space-y-1">
          <span className="text-xs text-zinc-400">Lý do *</span>
          <textarea
            className="min-h-[80px] w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white"
            onChange={(e) => setReason(e.target.value)}
            value={reason}
          />
        </label>
        <div className="mt-4 flex justify-end gap-2">
          <Button disabled={pending} onClick={onClose} type="button" variant="secondary">
            Huỷ
          </Button>
          <Button
            disabled={pending || !reason.trim()}
            onClick={confirm}
            type="button"
            variant={modal.type === "revoke" ? "danger" : "primary"}
          >
            {pending ? "Đang xử lý…" : "Xác nhận"}
          </Button>
        </div>
      </div>
    </div>
  );
}
