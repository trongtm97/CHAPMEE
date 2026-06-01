"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { FinanceWithdrawalChecklist } from "@/components/studio/finance/FinanceWithdrawalChecklist";
import {
  FinanceAlert,
  FinanceButton,
  FinanceSection,
  financeInputClass,
  formatFinanceVnd
} from "@/components/studio/finance/finance-ui";
import { studioFinanceWithdrawalAction } from "@/lib/studio/studio-finance-actions";
import type {
  BankAccountView,
  CreatorFinanceConfigView,
  StudioFinanceEligibility
} from "@/types/finance";

type FinanceWithdrawalSectionProps = {
  config: CreatorFinanceConfigView;
  availableBalanceVnd: number;
  bankAccounts: BankAccountView[];
  eligibility: StudioFinanceEligibility;
  pinRequired: boolean;
};

export function FinanceWithdrawalSection({
  config,
  availableBalanceVnd,
  bankAccounts,
  eligibility,
  pinRequired
}: FinanceWithdrawalSectionProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const withdrawableAccounts = useMemo(
    () => bankAccounts.filter((account) => account.canUseForWithdrawal),
    [bankAccounts]
  );
  const defaultAccount =
    withdrawableAccounts.find((account) => account.isDefault) ?? withdrawableAccounts[0] ?? null;

  const [selectedAccountId, setSelectedAccountId] = useState(defaultAccount?.id ?? "");
  const [amount, setAmount] = useState("");
  const [pin, setPin] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedAccount =
    withdrawableAccounts.find((account) => account.id === selectedAccountId) ?? defaultAccount;

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <FinanceSection
      description="Số tiền sẽ được giữ cho đến khi admin xử lý yêu cầu."
      id="withdrawal-request"
      title="Yêu cầu rút tiền"
    >
      <div className="grid gap-5 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-sm font-semibold text-zinc-300">Điều kiện rút tiền</p>
          <FinanceWithdrawalChecklist
            items={eligibility.checklist}
            onAction={(action) => {
              if (action === "add-bank") scrollTo("bank-accounts");
              if (action === "setup-pin") scrollTo("withdrawal-pin");
            }}
          />
        </div>

        <div>
          <div className="mb-4 grid gap-2 sm:grid-cols-2">
            <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/5 px-3 py-2">
              <p className="text-xs text-zinc-500">Có thể rút</p>
              <p className="font-bold text-emerald-100">{formatFinanceVnd(availableBalanceVnd)}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
              <p className="text-xs text-zinc-500">Rút tối thiểu</p>
              <p className="font-bold text-zinc-200">{formatFinanceVnd(config.minWithdrawAmountVnd)}</p>
            </div>
          </div>

          {withdrawableAccounts.length === 0 ? (
            <FinanceAlert tone="amber">
              Chưa có tài khoản hợp lệ để rút.{" "}
              <button
                className="font-semibold text-cyan-300 underline"
                onClick={() => scrollTo("bank-accounts")}
                type="button"
              >
                Thêm tài khoản nhận tiền
              </button>
            </FinanceAlert>
          ) : null}

          <form
            className="grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (!selectedAccount) return;
              setError(null);
              setMessage(null);
              startTransition(async () => {
                const result = await studioFinanceWithdrawalAction({
                  amountVnd: Number(amount),
                  method: "bank_transfer",
                  payoutAccountId: selectedAccount.id,
                  pin,
                  creatorNote: note.trim() || undefined
                });
                if (!result.ok) {
                  setError(result.error ?? "Không gửi được yêu cầu.");
                  return;
                }
                setMessage("Đã gửi yêu cầu rút tiền. Theo dõi trạng thái trong lịch sử bên dưới.");
                setAmount("");
                setPin("");
                setNote("");
                router.refresh();
              });
            }}
          >
            {withdrawableAccounts.length > 0 ? (
              <label className="block">
                <span className="mb-1 block text-xs text-zinc-400">Chọn tài khoản nhận tiền</span>
                <select
                  className={financeInputClass(pending || !eligibility.canWithdraw)}
                  disabled={pending || !eligibility.canWithdraw}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  value={selectedAccountId}
                >
                  {withdrawableAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.bankName} · {account.accountNumberDisplay}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <label className="block">
              <span className="mb-1 block text-xs text-zinc-400">Số tiền muốn rút (VND)</span>
              <input
                className={financeInputClass(pending || !eligibility.canWithdraw)}
                disabled={pending || !eligibility.canWithdraw}
                inputMode="numeric"
                min={config.minWithdrawAmountVnd}
                onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
                required
                value={amount}
              />
            </label>
            {pinRequired ? (
              <label className="block">
                <span className="mb-1 block text-xs text-zinc-400">PIN rút tiền</span>
                <input
                  className={financeInputClass(pending || !eligibility.canWithdraw)}
                  disabled={pending || !eligibility.canWithdraw}
                  inputMode="numeric"
                  maxLength={6}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                  required
                  type="password"
                  value={pin}
                />
              </label>
            ) : null}
            <label className="block">
              <span className="mb-1 block text-xs text-zinc-400">Ghi chú (tuỳ chọn)</span>
              <input
                className={financeInputClass(pending || !eligibility.canWithdraw)}
                disabled={pending || !eligibility.canWithdraw}
                maxLength={200}
                onChange={(e) => setNote(e.target.value)}
                value={note}
              />
            </label>
            <FinanceButton
              className="w-full sm:w-auto"
              disabled={
                pending ||
                !eligibility.canWithdraw ||
                !selectedAccount ||
                withdrawableAccounts.length === 0
              }
              tone="cyan"
              type="submit"
            >
              Gửi yêu cầu rút
            </FinanceButton>
          </form>

          {message ? <FinanceAlert tone="green">{message}</FinanceAlert> : null}
          {error ? <FinanceAlert tone="rose">{error}</FinanceAlert> : null}
        </div>
      </div>
    </FinanceSection>
  );
}
