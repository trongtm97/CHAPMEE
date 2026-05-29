"use client";

import { useState, useTransition } from "react";
import { Button, Input } from "@/components/ui";
import { studioUpdatePayoutProfileAction } from "@/lib/studio/studio-finance-actions";
import type { CreatorPayoutAccount, PayoutMethod } from "@/types/payout";
import type { CreatorFinanceConfigView } from "@/types/finance";

const METHOD_LABELS: Record<PayoutMethod, string> = {
  bank_transfer: "Chuyển khoản ngân hàng",
  momo: "MoMo",
  zalopay: "ZaloPay",
  manual: "Thủ công"
};

type PayoutProfileFormProps = {
  config: CreatorFinanceConfigView;
  accounts: CreatorPayoutAccount[];
};

export function PayoutProfileForm({ config, accounts }: PayoutProfileFormProps) {
  const [isPending, startTransition] = useTransition();
  const [method, setMethod] = useState<PayoutMethod>(config.payoutMethodsEnabled[0] ?? "manual");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [walletPhone, setWalletPhone] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await studioUpdatePayoutProfileAction({
        method,
        accountHolderName: accountHolderName || undefined,
        bankName: bankName || undefined,
        bankAccountNumber:
          method === "bank_transfer" ? bankAccountNumber : undefined,
        walletPhone: method === "momo" || method === "zalopay" ? walletPhone : undefined
      });
      if (!result.ok) {
        setError(result.error ?? "Không thể lưu.");
        return;
      }
      setMessage("Đã lưu. Chỉ hiển thị 4 số cuối sau khi lưu.");
      setBankAccountNumber("");
      setWalletPhone("");
    });
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-zinc-950/60 p-4 sm:p-5">
      <h2 className="text-base font-bold text-white">Thông tin nhận tiền</h2>
      <p className="mt-1 text-xs text-zinc-500">
        Số tài khoản/số ví chỉ lưu dạng đã che — không hiển thị toàn bộ sau khi lưu.
      </p>

      {accounts.length > 0 ? (
        <ul className="mt-4 space-y-2 text-sm text-zinc-300">
          {accounts.map((acc) => (
            <li
              key={acc.id}
              className="rounded-lg border border-white/10 px-3 py-2"
            >
              <span className="font-medium">{METHOD_LABELS[acc.method]}</span>
              {acc.is_default ? (
                <span className="ml-2 text-xs text-sky-400">Mặc định</span>
              ) : null}
              <p className="mt-1 text-xs text-zinc-500">
                {acc.account_holder_name ?? "—"} ·{" "}
                {acc.bank_account_number_masked ?? acc.wallet_phone_masked ?? "—"}
              </p>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-4 space-y-3">
        <label className="block text-xs text-zinc-500">
          Phương thức
          <select
            className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
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
        <Input
          label="Tên chủ tài khoản / ví"
          value={accountHolderName}
          onChange={(e) => setAccountHolderName(e.target.value)}
        />
        {method === "bank_transfer" ? (
          <>
            <Input label="Ngân hàng" value={bankName} onChange={(e) => setBankName(e.target.value)} />
            <Input
              label="Số tài khoản (chỉ nhập khi thêm/cập nhật)"
              value={bankAccountNumber}
              onChange={(e) => setBankAccountNumber(e.target.value)}
              type="password"
              autoComplete="off"
            />
          </>
        ) : null}
        {method === "momo" || method === "zalopay" ? (
          <Input
            label="Số điện thoại ví"
            value={walletPhone}
            onChange={(e) => setWalletPhone(e.target.value)}
            type="password"
            autoComplete="off"
          />
        ) : null}
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        {message ? <p className="text-sm text-emerald-400">{message}</p> : null}
        <Button disabled={isPending} onClick={handleSubmit} type="button">
          {isPending ? "Đang lưu…" : "Lưu thông tin nhận tiền"}
        </Button>
      </div>
    </section>
  );
}
