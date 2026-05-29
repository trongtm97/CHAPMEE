"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { debitCoinFromUserAction } from "@/lib/admin/debit-coin-from-user";
import { COIN_GRANT_FORM_COPY } from "@/components/admin/coin-form-copy";

type CoinDebitFormProps = {
  userId: string | null;
  onSuccess?: () => void;
};

export function CoinDebitForm({ onSuccess, userId }: CoinDebitFormProps) {
  const [amount, setAmount] = useState("30");
  const [reason, setReason] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    if (!userId) {
      setMessage("Chọn user trước.");
      return;
    }

    if (!window.confirm(COIN_GRANT_FORM_COPY.debitConfirm)) {
      return;
    }

    startTransition(async () => {
      const result = await debitCoinFromUserAction({
        userId,
        amount: Number(amount),
        coinType: "bonus",
        reason,
        adminNote
      });
      setMessage(result.error ?? "Đã trừ coin thành công.");
      if (result.ok) {
        onSuccess?.();
      }
    });
  }

  return (
    <div className="space-y-3 rounded-xl border border-red-400/20 bg-red-400/5 p-4">
      <p className="text-sm font-semibold text-white">Trừ coin</p>
      <label className="block space-y-1 text-sm">
        <span className="text-zinc-400">Số coin</span>
        <input
          className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-white"
          min={1}
          onChange={(event) => setAmount(event.target.value)}
          type="number"
          value={amount}
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span className="text-zinc-400">Lý do (bắt buộc)</span>
        <input
          className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-white"
          onChange={(event) => setReason(event.target.value)}
          value={reason}
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span className="text-zinc-400">Ghi chú nội bộ</span>
        <textarea
          className="min-h-20 w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-white"
          onChange={(event) => setAdminNote(event.target.value)}
          value={adminNote}
        />
      </label>
      <Button disabled={isPending || !userId} onClick={submit} type="button" variant="ghost">
        {isPending ? "Đang xử lý..." : "Xác nhận trừ coin"}
      </Button>
      {message ? <p className="text-sm text-cyan-200">{message}</p> : null}
    </div>
  );
}
