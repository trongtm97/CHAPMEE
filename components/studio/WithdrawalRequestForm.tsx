"use client";

import { useState, useTransition } from "react";
import { Button, Input, Textarea } from "@/components/ui";
import { studioWithdrawalRequestAction } from "@/lib/studio/studio-monetization-actions";
import type { CreatorPayoutAccount, PayoutMethod, PayoutRequest } from "@/types/payout";

type WithdrawalRequestFormProps = {
  availableRevenueVnd: number;
  minWithdrawAmountVnd: number;
  allowedMethods: PayoutMethod[];
  processingNote: string;
  kycRequired: boolean;
  kycVerified: boolean;
  creatorApproved: boolean;
  payoutEnabled: boolean;
  accounts: CreatorPayoutAccount[];
  recentRequests: PayoutRequest[];
};

const METHOD_LABELS: Record<PayoutMethod, string> = {
  bank_transfer: "Chuyển khoản ngân hàng",
  momo: "MoMo",
  zalopay: "ZaloPay",
  manual: "Thủ công (admin xử lý)"
};

export function WithdrawalRequestForm({
  availableRevenueVnd,
  minWithdrawAmountVnd,
  allowedMethods,
  processingNote,
  kycRequired,
  kycVerified,
  creatorApproved,
  payoutEnabled,
  accounts,
  recentRequests
}: WithdrawalRequestFormProps) {
  const [isPending, startTransition] = useTransition();
  const [amountVnd, setAmountVnd] = useState(String(minWithdrawAmountVnd || 0));
  const [method, setMethod] = useState<PayoutMethod>(allowedMethods[0] ?? "manual");
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccountNumberMasked, setBankAccountNumberMasked] = useState("");
  const [walletPhoneMasked, setWalletPhoneMasked] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const amount = Number(amountVnd);
  const canSubmitAmount =
    Number.isFinite(amount) && amount >= minWithdrawAmountVnd && amount <= availableRevenueVnd;

  const blockedReason = !payoutEnabled
    ? "Admin chưa bật rút tiền."
    : !creatorApproved
      ? "Tài khoản cần được duyệt kiếm tiền trước."
      : kycRequired && !kycVerified
        ? "Bạn cần xác minh thông tin (KYC) trước khi rút."
        : null;

  function handleSubmit() {
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const result = await studioWithdrawalRequestAction({
        amountVnd: amount,
        method,
        payoutAccountId: accountId || undefined,
        accountHolderName,
        bankName,
        bankAccountNumberMasked,
        walletPhoneMasked,
        note
      });

      if (!result.ok) {
        setError(result.error ?? "Không gửi được yêu cầu rút tiền.");
        return;
      }

      setSuccess("Đã gửi yêu cầu rút tiền. Admin sẽ xem xét thủ công.");
      window.location.reload();
    });
  }

  return (
    <section className="space-y-4 rounded-2xl border border-white/10 bg-zinc-950/60 p-4 sm:p-5">
      <div>
        <h2 className="text-base font-bold text-white">Yêu cầu rút tiền</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Số dư có thể rút:{" "}
          <span className="font-semibold text-white">
            {availableRevenueVnd.toLocaleString("vi-VN")} ₫
          </span>
          . Rút tối thiểu: {minWithdrawAmountVnd.toLocaleString("vi-VN")} ₫.
        </p>
      </div>

      {processingNote ? (
        <p className="rounded-xl border border-cyan-400/25 bg-cyan-400/10 px-3 py-2 text-sm text-cyan-100">
          {processingNote}
        </p>
      ) : null}

      {blockedReason ? (
        <p className="text-sm text-amber-300">{blockedReason}</p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="Số tiền muốn rút (VND)"
          min={minWithdrawAmountVnd}
          onChange={(event) => setAmountVnd(event.target.value)}
          step={1000}
          type="number"
          value={amountVnd}
        />
        <label className="space-y-1 text-sm">
          <span className="text-zinc-200">Phương thức nhận tiền</span>
          <select
            className="w-full min-h-11 rounded-xl border border-white/10 bg-zinc-900 px-3 text-sm text-white"
            onChange={(event) => setMethod(event.target.value as PayoutMethod)}
            value={method}
          >
            {allowedMethods.map((item) => (
              <option key={item} value={item}>
                {METHOD_LABELS[item]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {accounts.length > 0 ? (
        <label className="space-y-1 text-sm">
          <span className="text-zinc-200">Tài khoản đã lưu</span>
          <select
            className="w-full min-h-11 rounded-xl border border-white/10 bg-zinc-900 px-3 text-sm text-white"
            onChange={(event) => setAccountId(event.target.value)}
            value={accountId}
          >
            <option value="">Tạo mới bên dưới</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {METHOD_LABELS[account.method]} —{" "}
                {account.bank_account_number_masked ??
                  account.wallet_phone_masked ??
                  account.account_holder_name ??
                  account.id.slice(0, 8)}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="Tên người nhận"
          onChange={(event) => setAccountHolderName(event.target.value)}
          value={accountHolderName}
        />
        <Input
          label="Ngân hàng / ví"
          onChange={(event) => setBankName(event.target.value)}
          value={bankName}
        />
        <Input
          label="Số tài khoản (che bớt)"
          onChange={(event) => setBankAccountNumberMasked(event.target.value)}
          value={bankAccountNumberMasked}
        />
        <Input
          label="SĐT ví (che bớt)"
          onChange={(event) => setWalletPhoneMasked(event.target.value)}
          value={walletPhoneMasked}
        />
      </div>

      <Textarea
        label="Ghi chú (tùy chọn)"
        onChange={(event) => setNote(event.target.value)}
        rows={2}
        value={note}
      />

      <Button
        disabled={Boolean(blockedReason) || isPending || !canSubmitAmount}
        onClick={handleSubmit}
        type="button"
        variant="primary"
      >
        {isPending ? "Đang gửi..." : "Yêu cầu rút tiền"}
      </Button>

      <p className="text-xs text-zinc-500">
        Yêu cầu tạo trạng thái chờ duyệt; ChapMee không tự chuyển tiền thật.
      </p>

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-300">{success}</p> : null}

      {recentRequests.length > 0 ? (
        <div className="space-y-2 border-t border-white/10 pt-4">
          <p className="text-sm font-semibold text-zinc-200">Yêu cầu gần đây</p>
          <ul className="space-y-2">
            {recentRequests.map((request) => (
              <li
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm"
                key={request.id}
              >
                <span>{request.amount_vnd.toLocaleString("vi-VN")} ₫</span>
                <span className="text-zinc-400">{request.status}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
