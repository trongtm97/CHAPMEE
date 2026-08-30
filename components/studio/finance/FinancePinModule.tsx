"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FinanceModalShell } from "@/components/studio/finance/FinanceModalShell";
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

type FinancePinModuleProps = {
  pinConfigured: boolean;
  pinLocked: boolean;
  pinLockedUntil: string | null;
  pinRequired: boolean;
};

export function FinancePinModule({
  pinConfigured,
  pinLocked,
  pinLockedUntil,
  pinRequired
}: FinancePinModuleProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<"setup" | "change" | "reset">("setup");
  const [currentPin, setCurrentPin] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [step, setStep] = useState<1 | 2>(1);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const emailPurpose =
    mode === "setup" ? "setup_pin" : mode === "change" ? "change_pin" : "reset_pin";

  function openModal(nextMode: "setup" | "change" | "reset") {
    setMode(nextMode);
    setStep(1);
    setCurrentPin("");
    setPin("");
    setConfirmPin("");
    setEmailCode("");
    setError(null);
    setMessage(null);
    setModalOpen(true);
  }

  function run(
    action: () => Promise<{ ok: boolean; error?: string }>,
    options?: { success?: string; closeModal?: boolean; onSuccess?: () => void }
  ) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error ?? "Không thực hiện được.");
        return;
      }
      options?.onSuccess?.();
      if (options?.success) {
        setMessage(options.success);
      }
      if (options?.closeModal !== false) {
        setModalOpen(false);
      }
      router.refresh();
    });
  }

  return (
    <FinanceSection
      description="PIN 6 số bảo vệ yêu cầu rút tiền. Mọi thao tác đều cần mã email."
      id="withdrawal-pin"
      title="PIN rút tiền"
    >
      {pinLocked ? (
        <FinanceAlert tone="rose">
          PIN bị khóa tạm thời do nhập sai nhiều lần.
          {pinLockedUntil
            ? ` Thử lại sau ${new Date(pinLockedUntil).toLocaleString("vi-VN")}.`
            : null}
        </FinanceAlert>
      ) : null}

      <p className="text-sm text-zinc-400">
        {pinConfigured ? "PIN đã thiết lập." : "Bạn chưa thiết lập PIN rút tiền."}
        {!pinRequired ? " (Tùy chọn theo cấu hình nền tảng)" : null}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {!pinConfigured ? (
          <FinanceButton disabled={pending || pinLocked} onClick={() => openModal("setup")} tone="cyan">
            Thiết lập PIN
          </FinanceButton>
        ) : (
          <>
            <FinanceButton disabled={pending || pinLocked} onClick={() => openModal("change")} tone="cyan">
              Đổi PIN
            </FinanceButton>
            <FinanceButton disabled={pending || pinLocked} onClick={() => openModal("reset")} tone="slate">
              Quên PIN
            </FinanceButton>
          </>
        )}
      </div>

      {message ? <FinanceAlert tone="green">{message}</FinanceAlert> : null}

      <FinanceModalShell
        onClose={() => setModalOpen(false)}
        open={modalOpen}
        title={mode === "setup" ? "Thiết lập PIN" : mode === "change" ? "Đổi PIN" : "Quên PIN"}
      >
        {step === 1 ? (
          <div className="space-y-3">
            <p className="text-sm text-zinc-400">
              Bước 1: Gửi mã xác nhận đến email đăng ký của bạn.
            </p>
            <EmailDeliveryNotice compact />
            <FinanceButton
              disabled={pending}
              onClick={() =>
                run(() => studioRequestFinanceEmailCodeAction(emailPurpose), {
                  closeModal: false,
                  onSuccess: () => setStep(2),
                  success: withEmailSentSuccessHint("Mã xác nhận đã được gửi đến email của bạn.")
                })
              }
              tone="amber"
            >
              Gửi mã xác nhận email
            </FinanceButton>
            <FinanceButton disabled={pending} onClick={() => setStep(2)} tone="slate">
              Đã có mã — tiếp tục
            </FinanceButton>
          </div>
        ) : (
          <div className="grid gap-3">
            <p className="text-sm text-zinc-400">Bước 2: Nhập mã email và PIN mới.</p>
            {mode === "change" ? (
              <label className="block">
                <span className="mb-1 block text-xs text-zinc-400">PIN hiện tại</span>
                <input
                  className={financeInputClass(pending)}
                  inputMode="numeric"
                  maxLength={6}
                  onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ""))}
                  type="password"
                  value={currentPin}
                />
              </label>
            ) : null}
            <label className="block">
              <span className="mb-1 block text-xs text-zinc-400">PIN mới (6 số)</span>
              <input
                className={financeInputClass(pending)}
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
                inputMode="numeric"
                maxLength={6}
                onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, ""))}
                value={emailCode}
              />
            </label>
            <FinanceButton
              disabled={
                pending ||
                emailCode.length !== 6 ||
                pin.length !== 6 ||
                confirmPin.length !== 6 ||
                (mode === "change" && currentPin.length !== 6)
              }
              onClick={() => {
                if (mode === "setup") {
                  run(
                    () => studioSetWithdrawalPinAction({ pin, confirmPin, emailCode }),
                    { success: "Đã thiết lập PIN rút tiền." }
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
                    { success: "Đã đổi PIN rút tiền." }
                  );
                } else {
                  run(
                    () =>
                      studioResetWithdrawalPinAction({
                        emailCode,
                        newPin: pin,
                        confirmPin
                      }),
                    { success: "Đã đặt lại PIN rút tiền." }
                  );
                }
              }}
              tone="green"
            >
              Hoàn tất
            </FinanceButton>
          </div>
        )}
        {error ? <FinanceAlert tone="rose">{error}</FinanceAlert> : null}
      </FinanceModalShell>
    </FinanceSection>
  );
}
