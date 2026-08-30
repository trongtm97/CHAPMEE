"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  FinanceAlert,
  FinanceButton,
  FinanceSection,
  financeInputClass
} from "@/components/studio/finance/finance-ui";
import { EmailDeliveryNotice } from "@/components/ui";
import { withEmailSentSuccessHint } from "@/lib/email/email-delivery-copy";
import {
  studioChangeWithdrawalPinAction,
  studioRequestFinanceEmailCodeAction,
  studioResetWithdrawalPinAction,
  studioSetWithdrawalPinAction
} from "@/lib/studio/studio-finance-actions";

type FinancePinSectionProps = {
  pinConfigured: boolean;
  pinLocked: boolean;
  pinLockedUntil: string | null;
  pinRequired: boolean;
};

export function FinancePinSection({
  pinConfigured,
  pinLocked,
  pinLockedUntil,
  pinRequired
}: FinancePinSectionProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<"setup" | "change" | "reset">(pinConfigured ? "change" : "setup");
  const [currentPin, setCurrentPin] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<{ ok: boolean; error?: string }>, success: string) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error ?? "Không thực hiện được.");
        return;
      }
      setMessage(success);
      setCurrentPin("");
      setPin("");
      setConfirmPin("");
      setEmailCode("");
      router.refresh();
    });
  }

  const emailPurpose =
    mode === "setup" ? "setup_pin" : mode === "change" ? "change_pin" : "reset_pin";

  return (
    <FinanceSection
      description="PIN 6 số dùng khi gửi yêu cầu rút tiền. Mọi thao tác đều cần mã xác nhận qua email."
      id="withdrawal-pin"
      title="Mã PIN rút tiền"
    >
      {!pinRequired ? (
        <p className="mb-3 text-sm text-zinc-500">PIN tùy chọn theo cấu hình nền tảng.</p>
      ) : null}

      {pinLocked ? (
        <FinanceAlert tone="rose">
          Mã PIN bị khóa tạm thời do nhập sai nhiều lần.
          {pinLockedUntil ? ` Thử lại sau ${new Date(pinLockedUntil).toLocaleString("vi-VN")}.` : null}
        </FinanceAlert>
      ) : null}

      <div className="mb-3 flex flex-wrap gap-2">
        {!pinConfigured ? (
          <FinanceButton disabled={pending} onClick={() => setMode("setup")} tone="cyan">
            Thiết lập PIN
          </FinanceButton>
        ) : (
          <>
            <FinanceButton disabled={pending} onClick={() => setMode("change")} tone="cyan">
              Đổi PIN
            </FinanceButton>
            <FinanceButton disabled={pending} onClick={() => setMode("reset")} tone="slate">
              Quên PIN
            </FinanceButton>
          </>
        )}
      </div>

      <div className="mb-3 space-y-2">
        <EmailDeliveryNotice compact />
        <FinanceButton
          disabled={pending}
          onClick={() =>
            run(
              () => studioRequestFinanceEmailCodeAction(emailPurpose),
              withEmailSentSuccessHint("Mã xác nhận đã được gửi đến email của bạn.")
            )
          }
          tone="amber"
        >
          Gửi mã xác nhận email
        </FinanceButton>
      </div>

      <div className="grid max-w-md gap-3">
        {mode === "change" ? (
          <label className="block">
            <span className="mb-1 block text-xs text-zinc-400">PIN hiện tại</span>
            <input
              className={financeInputClass(pending)}
              disabled={pending}
              inputMode="numeric"
              maxLength={6}
              onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ""))}
              type="password"
              value={currentPin}
            />
          </label>
        ) : null}

        <label className="block">
          <span className="mb-1 block text-xs text-zinc-400">
            {mode === "reset" ? "PIN mới" : mode === "change" ? "PIN mới" : "PIN rút tiền (6 số)"}
          </span>
          <input
            className={financeInputClass(pending)}
            disabled={pending}
            inputMode="numeric"
            maxLength={6}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            type="password"
            value={pin}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-zinc-400">Xác nhận PIN</span>
          <input
            className={financeInputClass(pending)}
            disabled={pending}
            inputMode="numeric"
            maxLength={6}
            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
            type="password"
            value={confirmPin}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-zinc-400">Mã xác nhận email</span>
          <input
            className={financeInputClass(pending)}
            disabled={pending}
            inputMode="numeric"
            maxLength={6}
            onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, ""))}
            value={emailCode}
          />
        </label>
        <FinanceButton
          disabled={pending || emailCode.length !== 6 || pin.length !== 6 || confirmPin.length !== 6}
          onClick={() => {
            if (mode === "setup") {
              run(
                () => studioSetWithdrawalPinAction({ pin, confirmPin, emailCode }),
                "Đã thiết lập PIN rút tiền."
              );
            } else if (mode === "change") {
              run(
                () =>
                  studioChangeWithdrawalPinAction({
                    currentPin,
                    newPin: pin,
                    confirmPin,
                    emailCode
                  }),
                "Đã đổi PIN rút tiền."
              );
            } else {
              run(
                () => studioResetWithdrawalPinAction({ emailCode, newPin: pin, confirmPin }),
                "Đã đặt lại PIN rút tiền."
              );
            }
          }}
          tone="green"
        >
          {mode === "setup" ? "Lưu PIN" : mode === "change" ? "Đổi PIN" : "Đặt lại PIN"}
        </FinanceButton>
      </div>

      {message ? <FinanceAlert tone="green">{message}</FinanceAlert> : null}
      {error ? <FinanceAlert tone="rose">{error}</FinanceAlert> : null}
    </FinanceSection>
  );
}
