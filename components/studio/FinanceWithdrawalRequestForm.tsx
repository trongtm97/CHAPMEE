"use client";

import { useState, useTransition } from "react";
import { Button, Input, Textarea } from "@/components/ui";
import { studioFinanceWithdrawalAction } from "@/lib/studio/studio-finance-actions";
import type { CreatorFinanceConfigView } from "@/types/finance";
import type { CreatorPayoutAccount, PayoutMethod } from "@/types/payout";

const METHOD_LABELS: Record<PayoutMethod, string> = {
  bank_transfer: "Chuyển khoản",
  momo: "MoMo",
  zalopay: "ZaloPay",
  manual: "Thủ công"
};

type FinanceWithdrawalRequestFormProps = {
  config: CreatorFinanceConfigView;
  availableBalanceVnd: number;
  accounts: CreatorPayoutAccount[];
  canWithdraw: boolean;
  blockReason: string | null;
  pinRequired: boolean;
};

export function FinanceWithdrawalRequestForm({
  config,
  availableBalanceVnd,
  accounts,
  canWithdraw,
  blockReason,
  pinRequired
}: FinanceWithdrawalRequestFormProps) {
  const [isPending, startTransition] = useTransition();
  const defaultAccount = accounts.find((a) => a.is_default) ?? accounts[0];
  const [amountVnd, setAmountVnd] = useState(String(config.minWithdrawAmountVnd || 0));
  const [method, setMethod] = useState<PayoutMethod>(
    defaultAccount?.method ?? config.payoutMethodsEnabled[0] ?? "manual"
  );
  const [accountId, setAccountId] = useState(defaultAccount?.id ?? "");
  const [pin, setPin] = useState("");
  const [creatorNote, setCreatorNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const amount = Number(amountVnd);

  function handleSubmit() {
    setError(null);
    setSuccess(null);
    if (!accountId) {
      setError("Vui lòng chọn hoặc thêm thông tin nhận tiền.");
      return;
    }
    startTransition(async () => {
      const result = await studioFinanceWithdrawalAction({
        amountVnd: amount,
        method,
        payoutAccountId: accountId,
        pin,
        creatorNote: creatorNote || undefined
      });
      if (!result.ok) {
        setError(result.error ?? "Không thể gửi yêu cầu.");
        return;
      }
      setSuccess("Đã gửi yêu cầu rút tiền. Số dư đang chờ được duyệt.");
      setPin("");
    });
  }

  if (!config.withdrawalsEnabled) {
    return (
      <section className="rounded-2xl border border-white/10 bg-zinc-950/60 p-4 sm:p-5">
        <h2 className="text-base font-bold text-white">Yêu cầu rút tiền</h2>
        <p className="mt-2 text-sm text-zinc-500">Rút tiền chưa được bật trên nền tảng.</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-zinc-950/60 p-4 sm:p-5">
      <h2 className="text-base font-bold text-white">Yêu cầu rút tiền</h2>
      <p className="mt-1 text-xs text-zinc-500">
        Số dư có thể rút: {availableBalanceVnd.toLocaleString("vi-VN")} ₫ · Tối thiểu:{" "}
        {config.minWithdrawAmountVnd.toLocaleString("vi-VN")} ₫
      </p>
      <p className="mt-2 text-xs leading-relaxed text-zinc-400">
        Số dư có thể rút đã là số tiền sau khi trừ phí nền tảng từ từng giao dịch. ChapMee không
        trừ lại phí nền tảng khi bạn gửi yêu cầu rút tiền.
      </p>
      {blockReason && !canWithdraw ? (
        <p className="mt-2 text-sm text-amber-300">{blockReason}</p>
      ) : null}
      <div className="mt-4 max-w-md space-y-3">
        <Input
          label="Số tiền muốn rút (VND)"
          value={amountVnd}
          onChange={(e) => setAmountVnd(e.target.value)}
          type="number"
          min={config.minWithdrawAmountVnd}
          max={availableBalanceVnd}
        />
        <label className="block text-xs text-zinc-500">
          Phương thức
          <select
            className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm"
            value={method}
            onChange={(e) => setMethod(e.target.value as PayoutMethod)}
          >
            {config.payoutMethodsEnabled.map((m) => (
              <option key={m} value={m}>
                {METHOD_LABELS[m]}
              </option>
            ))}
          </select>
        </label>
        {accounts.length > 0 ? (
          <label className="block text-xs text-zinc-500">
            Tài khoản nhận
            <select
              className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {METHOD_LABELS[acc.method]} —{" "}
                  {acc.bank_account_number_masked ?? acc.wallet_phone_masked ?? acc.id.slice(0, 8)}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <Textarea
          label="Ghi chú (tuỳ chọn)"
          value={creatorNote}
          onChange={(e) => setCreatorNote(e.target.value)}
          rows={2}
        />
        {pinRequired ? (
          <Input
            label="Mã PIN rút tiền"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
            type="password"
            inputMode="numeric"
            maxLength={6}
          />
        ) : null}
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        {success ? <p className="text-sm text-emerald-400">{success}</p> : null}
        <Button
          disabled={isPending || !canWithdraw}
          onClick={handleSubmit}
          type="button"
        >
          {isPending ? "Đang gửi…" : "Yêu cầu rút tiền"}
        </Button>
      </div>
    </section>
  );
}
