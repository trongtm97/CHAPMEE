"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import {
  disableCreatorMonetizationAccessAction,
  disableCreatorWithdrawalAccessAction,
  enableCreatorMonetizationAccessAction,
  enableCreatorWithdrawalAccessAction
} from "@/lib/admin/creator-access-actions";
import type { CreatorAccessStatus } from "@/types/creator-access";

type Props = {
  userId: string;
  access: CreatorAccessStatus;
  canManage: boolean;
  onRefresh: () => void;
};

type ModalKind =
  | "disable_monetization"
  | "enable_monetization"
  | "disable_withdrawal"
  | "enable_withdrawal"
  | null;

export function CreatorAccessControls({ userId, access, canManage, onRefresh }: Props) {
  const [modal, setModal] = useState<ModalKind>(null);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function closeModal() {
    setModal(null);
    setReason("");
    setNote("");
    setError(null);
  }

  function run(action: () => Promise<{ ok: boolean; error?: string | null }>) {
    startTransition(async () => {
      setError(null);
      const result = await action();
      if (!result.ok) {
        setError(result.error ?? "Không thể cập nhật.");
        return;
      }
      closeModal();
      onRefresh();
    });
  }

  const monetizationLabel = access.monetizationEnabled
    ? "Đang bật (mặc định)"
    : "Đã bị admin tắt";
  const withdrawalLabel = access.withdrawalEnabled
    ? "Đang bật (mặc định)"
    : "Đã bị admin tắt";

  return (
    <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-4">
      <h4 className="text-sm font-semibold text-cyan-100">Quyền kiếm tiền & rút tiền</h4>
      <p className="mt-1 text-xs text-zinc-400">
        Mặc định creator được kiếm tiền và rút tiền. Chỉ tắt thủ công khi cần khóa riêng tài
        khoản.
      </p>

      <dl className="mt-4 space-y-3 text-sm">
        <div>
          <dt className="text-zinc-500">Kiếm tiền</dt>
          <dd className="font-medium text-white">{monetizationLabel}</dd>
          {!access.monetizationEnabled && access.monetizationDisabledReason ? (
            <dd className="mt-1 text-xs text-rose-200">{access.monetizationDisabledReason}</dd>
          ) : null}
        </div>
        <div>
          <dt className="text-zinc-500">Rút tiền</dt>
          <dd className="font-medium text-white">{withdrawalLabel}</dd>
          {!access.withdrawalEnabled && access.withdrawalDisabledReason ? (
            <dd className="mt-1 text-xs text-rose-200">{access.withdrawalDisabledReason}</dd>
          ) : null}
        </div>
      </dl>

      {canManage ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {access.monetizationEnabled ? (
            <Button
              onClick={() => setModal("disable_monetization")}
              type="button"
              variant="danger"
            >
              Tắt kiếm tiền
            </Button>
          ) : (
            <Button
              onClick={() => setModal("enable_monetization")}
              type="button"
              variant="secondary"
            >
              Bật lại kiếm tiền
            </Button>
          )}
          {access.withdrawalEnabled ? (
            <Button
              onClick={() => setModal("disable_withdrawal")}
              type="button"
              variant="danger"
            >
              Tắt rút tiền
            </Button>
          ) : (
            <Button
              onClick={() => setModal("enable_withdrawal")}
              type="button"
              variant="secondary"
            >
              Bật lại rút tiền
            </Button>
          )}
        </div>
      ) : null}

      {modal ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0b1016] p-5">
            <h3 className="text-base font-bold text-white">
              {modal === "disable_monetization" && "Tắt kiếm tiền"}
              {modal === "enable_monetization" && "Bật lại kiếm tiền"}
              {modal === "disable_withdrawal" && "Tắt rút tiền"}
              {modal === "enable_withdrawal" && "Bật lại rút tiền"}
            </h3>
            <p className="mt-2 text-sm text-zinc-400">
              {modal.startsWith("disable")
                ? "Tác giả sẽ không ghi nhận doanh thu mới hoặc không gửi được yêu cầu rút tiền cho đến khi bạn bật lại."
                : "Quyền sẽ trở về trạng thái mặc định (bật) cho tài khoản này."}
            </p>
            {modal.startsWith("disable") ? (
              <label className="mt-4 block text-sm text-zinc-300">
                Lý do (bắt buộc)
                <textarea
                  className="mt-1 w-full rounded-lg border border-white/10 bg-[#0b1016] px-3 py-2 text-sm text-white"
                  onChange={(e) => setReason(e.target.value)}
                  required
                  rows={3}
                  value={reason}
                />
              </label>
            ) : null}
            <label className="mt-3 block text-sm text-zinc-300">
              Ghi chú admin (tùy chọn)
              <textarea
                className="mt-1 w-full rounded-lg border border-white/10 bg-[#0b1016] px-3 py-2 text-sm text-white"
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                value={note}
              />
            </label>
            {error ? <p className="mt-2 text-sm text-rose-300">{error}</p> : null}
            <div className="mt-4 flex justify-end gap-2">
              <Button disabled={pending} onClick={closeModal} type="button" variant="secondary">
                Hủy
              </Button>
              <Button
                disabled={pending || (modal.startsWith("disable") && !reason.trim())}
                onClick={() => {
                  if (modal === "disable_monetization") {
                    run(() =>
                      disableCreatorMonetizationAccessAction({
                        targetUserId: userId,
                        reason,
                        note
                      })
                    );
                  } else if (modal === "enable_monetization") {
                    run(() =>
                      enableCreatorMonetizationAccessAction({ targetUserId: userId, note })
                    );
                  } else if (modal === "disable_withdrawal") {
                    run(() =>
                      disableCreatorWithdrawalAccessAction({
                        targetUserId: userId,
                        reason,
                        note
                      })
                    );
                  } else if (modal === "enable_withdrawal") {
                    run(() =>
                      enableCreatorWithdrawalAccessAction({ targetUserId: userId, note })
                    );
                  }
                }}
                type="button"
                variant={modal.startsWith("disable") ? "danger" : "primary"}
              >
                {pending ? "Đang lưu..." : "Xác nhận"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
