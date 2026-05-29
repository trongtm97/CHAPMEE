"use client";

import { useState, useTransition } from "react";
import { Button, Input } from "@/components/ui";
import {
  createCreatorPayoutAccountAction,
  requestPayoutAction
} from "@/lib/monetization/payouts";
import type { CreatorPayoutAccount, PayoutMethod } from "@/types/payout";

type PayoutRequestFormProps = {
  availableRevenueVnd: number;
  minWithdrawAmountVnd: number;
  allowedMethods: PayoutMethod[];
  accounts: CreatorPayoutAccount[];
  kycRequired: boolean;
  kycVerified: boolean;
  creatorApproved: boolean;
  payoutEnabled: boolean;
  processingNote: string;
};

export function PayoutRequestForm({
  availableRevenueVnd,
  minWithdrawAmountVnd,
  allowedMethods,
  accounts,
  kycRequired,
  kycVerified,
  creatorApproved,
  payoutEnabled,
  processingNote
}: PayoutRequestFormProps) {
  const [pending, startTransition] = useTransition();
  const [amountVnd, setAmountVnd] = useState(String(minWithdrawAmountVnd || 0));
  const [method, setMethod] = useState<PayoutMethod>(allowedMethods[0] ?? "manual");
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccountNumberMasked, setBankAccountNumberMasked] = useState("");
  const [walletPhoneMasked, setWalletPhoneMasked] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const blockedReason = !payoutEnabled
    ? "Payout đang tắt bởi admin."
    : !creatorApproved
      ? "Tài khoản tác giả cần được duyệt trước khi rút tiền."
      : kycRequired && !kycVerified
        ? "Bạn cần xác minh thông tin trước khi rút tiền."
        : null;

  function onCreateAccount() {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await createCreatorPayoutAccountAction({
        method,
        accountHolderName,
        bankName,
        bankAccountNumberMasked,
        walletPhoneMasked,
        setDefault: true
      });
      if (!result.ok || !result.data) {
        setError(result.error ?? "Không thể tạo payout account.");
        return;
      }
      setSuccess("Đã tạo payout account.");
      setAccountId(result.data.id);
      window.location.reload();
    });
  }

  function onRequestPayout() {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await requestPayoutAction({
        amountVnd: Number(amountVnd),
        method,
        payoutAccountId: accountId
      });
      if (!result.ok) {
        setError(result.error ?? "Không thể tạo yêu cầu rút tiền.");
        return;
      }
      setSuccess("Đã gửi yêu cầu rút tiền.");
      window.location.reload();
    });
  }

  return (
    <div className="space-y-4">
      {processingNote ? (
        <p className="rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-sm text-cyan-100">
          {processingNote}
        </p>
      ) : null}
      <p className="text-sm text-zinc-300">
        Available: <span className="font-semibold text-white">{availableRevenueVnd.toLocaleString("vi-VN")} VND</span>
      </p>
      {blockedReason ? (
        <p className="text-sm text-amber-300">{blockedReason}</p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="Số tiền rút (VND)"
          min={minWithdrawAmountVnd}
          onChange={(event) => setAmountVnd(event.currentTarget.value)}
          step={1000}
          type="number"
          value={amountVnd}
        />
        <label className="space-y-1 text-sm">
          <span className="text-zinc-200">Phương thức</span>
          <select
            className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
            onChange={(event) => setMethod(event.currentTarget.value as PayoutMethod)}
            value={method}
          >
            {allowedMethods.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="space-y-1 text-sm">
        <span className="text-zinc-200">Payout account</span>
        <select
          className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
          onChange={(event) => setAccountId(event.currentTarget.value)}
          value={accountId}
        >
          <option value="">Chọn payout account</option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.method} -{" "}
              {account.bank_account_number_masked ??
                account.wallet_phone_masked ??
                account.account_holder_name ??
                account.id.slice(0, 8)}
            </option>
          ))}
        </select>
      </label>

      <div className="space-y-2 rounded-xl border border-white/10 p-3">
        <p className="text-sm font-semibold text-white">Tạo payout account nhanh (MVP)</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Account holder"
            onChange={(event) => setAccountHolderName(event.currentTarget.value)}
            type="text"
            value={accountHolderName}
          />
          <Input
            label="Bank name"
            onChange={(event) => setBankName(event.currentTarget.value)}
            type="text"
            value={bankName}
          />
          <Input
            label="Bank account masked"
            onChange={(event) => setBankAccountNumberMasked(event.currentTarget.value)}
            type="text"
            value={bankAccountNumberMasked}
          />
          <Input
            label="Wallet phone masked"
            onChange={(event) => setWalletPhoneMasked(event.currentTarget.value)}
            type="text"
            value={walletPhoneMasked}
          />
        </div>
        <Button
          disabled={pending || Boolean(blockedReason)}
          loading={pending}
          onClick={onCreateAccount}
          type="button"
          variant="secondary"
        >
          Lưu payout account
        </Button>
      </div>

      <Button
        disabled={pending || Boolean(blockedReason) || !accountId}
        loading={pending}
        onClick={onRequestPayout}
        type="button"
      >
        Yêu cầu rút tiền
      </Button>
      <p className="text-xs text-zinc-400">
        Không tự động chuyển tiền thật trong MVP, mọi payout cần review thủ công.
      </p>
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-300">{success}</p> : null}
    </div>
  );
}
