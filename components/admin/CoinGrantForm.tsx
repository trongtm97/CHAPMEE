"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { grantCoinToUserAction } from "@/lib/admin/grant-coin-to-user";

type CoinGrantFormProps = {
  userId: string | null;
  onSuccess?: () => void;
};

export function CoinGrantForm({ onSuccess, userId }: CoinGrantFormProps) {
  const [amount, setAmount] = useState("100");
  const [coinType, setCoinType] = useState<"paid" | "bonus">("bonus");
  const [reason, setReason] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    if (!userId) {
      setMessage("Chọn user trước.");
      return;
    }

    startTransition(async () => {
      const result = await grantCoinToUserAction({
        userId,
        amount: Number(amount),
        coinType,
        reason,
        adminNote
      });
      setMessage(result.error ?? "Đã cộng coin thành công.");
      if (result.ok) {
        onSuccess?.();
      }
    });
  }

  return (
    <div className="space-y-3 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4">
      <p className="text-sm font-semibold text-white">Cộng coin</p>
      <div className="grid gap-3 sm:grid-cols-2">
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
          <span className="text-zinc-400">Loại coin</span>
          <select
            className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-white"
            onChange={(event) =>
              setCoinType(event.target.value as "paid" | "bonus")
            }
            value={coinType}
          >
            <option value="bonus">Coin thưởng</option>
            <option value="paid">Coin nạp</option>
          </select>
        </label>
      </div>
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
      <Button disabled={isPending || !userId} onClick={submit} type="button">
        {isPending ? "Đang xử lý..." : "Xác nhận cộng coin"}
      </Button>
      {message ? <p className="text-sm text-cyan-200">{message}</p> : null}
    </div>
  );
}
