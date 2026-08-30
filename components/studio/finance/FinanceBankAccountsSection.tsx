"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FinanceModalShell } from "@/components/studio/finance/FinanceModalShell";
import {
  FinanceAlert,
  FinanceBadge,
  FinanceButton,
  FinanceSection,
  financeInputClass
} from "@/components/studio/finance/finance-ui";
import {
  studioAddBankAccountAction,
  studioConfirmBankAccountEmailAction,
  studioRemoveBankAccountAction,
  studioResendBankEmailCodeAction,
  studioSetDefaultBankAccountAction,
  studioUpdateBankAccountAction
} from "@/lib/studio/studio-finance-actions";
import { EmailDeliveryNotice } from "@/components/ui";
import { withEmailSentSuccessHint } from "@/lib/email/email-delivery-copy";
import type { BankAccountView, FinanceIdentityStatus } from "@/types/finance";

const ACCOUNT_STATUS: Record<
  BankAccountView["accountStatus"],
  { label: string; tone: "green" | "amber" | "rose" | "purple" | "slate" }
> = {
  verified: { label: "Đã xác thực", tone: "green" },
  pending_email: { label: "Chưa xác thực email", tone: "amber" },
  pending_identity: { label: "Chờ xác thực danh tính", tone: "purple" },
  locked_24h: { label: "Đang khóa rút 24h", tone: "amber" },
  locked_by_admin: { label: "Bị admin khóa", tone: "rose" }
};

const MATCH_LABEL: Record<BankAccountView["identityNameMatchStatus"], string> = {
  matched: "Khớp tên xác thực",
  mismatched: "Không khớp tên xác thực",
  unknown: "Chưa có dữ liệu xác thực"
};

type FinanceBankAccountsSectionProps = {
  accounts: BankAccountView[];
  identity: FinanceIdentityStatus;
};

export function FinanceBankAccountsSection({
  accounts,
  identity
}: FinanceBankAccountsSectionProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<BankAccountView | null>(null);
  const [verifyAccountId, setVerifyAccountId] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [holderName, setHolderName] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [branch, setBranch] = useState("");
  const [confirmOwnership, setConfirmOwnership] = useState(false);

  function openAdd() {
    setEditing(null);
    setHolderName(identity.verifiedName ?? "");
    setBankName("");
    setAccountNumber("");
    setBranch("");
    setConfirmOwnership(false);
    setModalOpen(true);
    setError(null);
    setMessage(null);
  }

  function openEdit(account: BankAccountView) {
    setEditing(account);
    setHolderName(account.accountHolderName);
    setBankName(account.bankName);
    setAccountNumber("");
    setBranch(account.branchNote ?? "");
    setConfirmOwnership(false);
    setModalOpen(true);
  }

  function run(
    action: () => Promise<{ ok: boolean; error?: string }>,
    success: string,
    options?: { closeModal?: boolean }
  ) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error ?? "Không thực hiện được.");
        return;
      }
      setMessage(success);
      if (options?.closeModal !== false) {
        setModalOpen(false);
      }
      router.refresh();
    });
  }

  return (
    <FinanceSection
      description="Quản lý nhiều tài khoản ngân hàng Việt Nam. Số tài khoản được che khi hiển thị."
      id="bank-accounts"
      title="Tài khoản nhận tiền"
    >
      <div className="mb-3 flex flex-wrap gap-2">
        <FinanceButton disabled={pending} onClick={openAdd} tone="cyan">
          Thêm tài khoản ngân hàng
        </FinanceButton>
      </div>

      {accounts.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-zinc-500">
          Chưa có tài khoản nhận tiền. Thêm tài khoản để chuẩn bị rút tiền.
        </p>
      ) : (
        <ul className="space-y-2">
          {accounts.map((account) => {
            const status = ACCOUNT_STATUS[account.accountStatus];
            return (
              <li
                className="rounded-xl border border-white/10 bg-white/[0.02] p-3"
                key={account.id}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-zinc-100">{account.bankName}</p>
                    <p className="text-sm text-zinc-400">{account.accountNumberDisplay}</p>
                    <p className="text-xs text-zinc-500">{account.accountHolderName}</p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {account.isDefault ? (
                      <FinanceBadge tone="cyan">Mặc định</FinanceBadge>
                    ) : null}
                    <FinanceBadge tone={status.tone}>{status.label}</FinanceBadge>
                  </div>
                </div>
                <p className="mt-2 text-xs text-zinc-500">{MATCH_LABEL[account.identityNameMatchStatus]}</p>
                {account.lockRemainingLabel ? (
                  <FinanceAlert tone="amber">
                    Tài khoản này vừa được thay đổi. Bạn có thể dùng để rút sau:{" "}
                    {account.lockRemainingLabel}.
                  </FinanceAlert>
                ) : null}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {!account.isDefault ? (
                    <FinanceButton
                      className="!h-8 !px-2 !text-[11px]"
                      disabled={pending}
                      onClick={() =>
                        run(
                          () => studioSetDefaultBankAccountAction(account.id),
                          "Đã đặt làm mặc định."
                        )
                      }
                      tone="slate"
                    >
                      Đặt làm mặc định
                    </FinanceButton>
                  ) : null}
                  <FinanceButton
                    className="!h-8 !px-2 !text-[11px]"
                    disabled={pending}
                    onClick={() => openEdit(account)}
                    tone="slate"
                  >
                    Sửa
                  </FinanceButton>
                  <FinanceButton
                    className="!h-8 !px-2 !text-[11px]"
                    disabled={pending}
                    onClick={() =>
                      run(() => studioRemoveBankAccountAction(account.id), "Đã xóa tài khoản.")
                    }
                    tone="rose"
                  >
                    Xóa
                  </FinanceButton>
                  {account.accountStatus === "pending_email" ? (
                    <FinanceButton
                      className="!h-8 !px-2 !text-[11px]"
                      disabled={pending}
                      onClick={() => {
                        setVerifyAccountId(account.id);
                        run(
                          () => studioResendBankEmailCodeAction(),
                          withEmailSentSuccessHint(
                            "Mã xác nhận đã được gửi đến email của bạn."
                          ),
                          { closeModal: false }
                        );
                      }}
                      tone="amber"
                    >
                      Gửi lại email xác thực
                    </FinanceButton>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {verifyAccountId || accounts.some((a) => a.accountStatus === "pending_email") ? (
        <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
          <p className="text-sm font-medium text-zinc-300">Xác thực email tài khoản</p>
          <EmailDeliveryNotice compact />
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              className={financeInputClass(pending)}
              disabled={pending}
              inputMode="numeric"
              maxLength={6}
              onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ""))}
              placeholder="Nhập mã 6 số"
              value={verifyCode}
            />
            <FinanceButton
              disabled={pending || verifyCode.length !== 6}
              onClick={() =>
                run(
                  () => studioConfirmBankAccountEmailAction({
                    code: verifyCode,
                    accountId: verifyAccountId ?? undefined
                  }),
                  "Xác thực email thành công.",
                  { closeModal: false }
                )
              }
              tone="green"
            >
              Xác nhận mã
            </FinanceButton>
          </div>
        </div>
      ) : null}

      {message ? <FinanceAlert tone="green">{message}</FinanceAlert> : null}
      {error ? <FinanceAlert tone="rose">{error}</FinanceAlert> : null}

      <FinanceModalShell
        onClose={() => setModalOpen(false)}
        open={modalOpen}
        title={editing ? "Sửa tài khoản ngân hàng" : "Thêm tài khoản ngân hàng"}
      >
        <div className="grid gap-3">
          <label className="block">
            <span className="mb-1 block text-xs text-zinc-400">Tên chủ tài khoản</span>
            <input
              className={financeInputClass(pending)}
              disabled={pending}
              onChange={(e) => setHolderName(e.target.value)}
              value={holderName}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-zinc-400">Ngân hàng</span>
            <input
              className={financeInputClass(pending)}
              disabled={pending}
              onChange={(e) => setBankName(e.target.value)}
              value={bankName}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-zinc-400">
              Số tài khoản {editing ? "(để trống nếu không đổi)" : ""}
            </span>
            <input
              className={financeInputClass(pending)}
              disabled={pending}
              inputMode="numeric"
              onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
              value={accountNumber}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-zinc-400">Chi nhánh / ghi chú</span>
            <input
              className={financeInputClass(pending)}
              disabled={pending}
              onChange={(e) => setBranch(e.target.value)}
              value={branch}
            />
          </label>
          <label className="flex items-start gap-2 text-sm text-zinc-400">
            <input
              checked={confirmOwnership}
              className="mt-1"
              onChange={(e) => setConfirmOwnership(e.target.checked)}
              type="checkbox"
            />
            Tôi xác nhận tài khoản ngân hàng thuộc về tôi và tên chủ tài khoản phải khớp với thông
            tin xác thực.
          </label>
          <FinanceButton
            disabled={pending || !confirmOwnership}
            onClick={() => {
              if (editing) {
                run(
                  () =>
                    studioUpdateBankAccountAction({
                      accountId: editing.id,
                      accountHolderName: holderName,
                      bankName,
                      bankAccountNumber: accountNumber || undefined,
                      bankBranch: branch || undefined,
                      confirmOwnership
                    }),
                  withEmailSentSuccessHint(
                    "Đã lưu tài khoản. Kiểm tra email nếu cần xác thực lại."
                  )
                );
              } else {
                run(
                  () =>
                    studioAddBankAccountAction({
                      accountHolderName: holderName,
                      bankName,
                      bankAccountNumber: accountNumber,
                      bankBranch: branch || undefined,
                      confirmOwnership,
                      setAsDefault: accounts.length === 0
                    }),
                  withEmailSentSuccessHint(
                    "Đã thêm tài khoản. Mã xác nhận đã được gửi đến email của bạn."
                  )
                );
              }
            }}
            tone="cyan"
          >
            Lưu tài khoản
          </FinanceButton>
        </div>
      </FinanceModalShell>
    </FinanceSection>
  );
}
