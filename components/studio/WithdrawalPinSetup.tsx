"use client";

import { useState, useTransition } from "react";
import { Button, Input } from "@/components/ui";
import {
  studioChangeWithdrawalPinAction,
  studioSetWithdrawalPinAction
} from "@/lib/studio/studio-finance-actions";

type WithdrawalPinSetupProps = {
  pinConfigured: boolean;
  pinLocked: boolean;
  pinLockedUntil: string | null;
  pinRequired: boolean;
};

export function WithdrawalPinSetup({
  pinConfigured,
  pinLocked,
  pinLockedUntil,
  pinRequired
}: WithdrawalPinSetupProps) {
  const [isPending, startTransition] = useTransition();
  const [currentPin, setCurrentPin] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function handleSubmit() {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = pinConfigured
        ? await studioChangeWithdrawalPinAction({
            currentPin,
            newPin: pin,
            confirmPin,
            emailCode: "000000"
          })
        : await studioSetWithdrawalPinAction({ pin, confirmPin, emailCode: "000000" });

      if (!result.ok) {
        setError(result.error ?? "Không thể cập nhật PIN.");
        return;
      }
      setSuccess(pinConfigured ? "Đã đổi mã PIN." : "Đã thiết lập mã PIN rút tiền.");
      setCurrentPin("");
      setPin("");
      setConfirmPin("");
    });
  }

  if (!pinRequired) {
    return (
      <section className="rounded-2xl border border-white/10 bg-zinc-950/60 p-4 sm:p-5">
        <h2 className="text-base font-bold text-white">Mã PIN rút tiền</h2>
        <p className="mt-2 text-sm text-zinc-500">Admin chưa bắt buộc PIN khi rút tiền.</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-zinc-950/60 p-4 sm:p-5">
      <h2 className="text-base font-bold text-white">Mã PIN rút tiền</h2>
      <p className="mt-1 text-xs text-zinc-500">
        PIN 6 chữ số, lưu dạng mã hóa. Sai 5 lần sẽ khóa 30 phút.
      </p>
      {pinLocked ? (
        <p className="mt-2 text-sm text-amber-300">
          PIN đang bị khóa đến{" "}
          {pinLockedUntil
            ? new Date(pinLockedUntil).toLocaleString("vi-VN")
            : "sau khi hết thời gian chờ"}
          .
        </p>
      ) : null}
      <div className="mt-4 max-w-sm space-y-3">
        {pinConfigured ? (
          <Input
            label="PIN hiện tại"
            value={currentPin}
            onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            maxLength={6}
            type="password"
          />
        ) : null}
        <Input
          label={pinConfigured ? "PIN mới" : "PIN (6 số)"}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
          inputMode="numeric"
          maxLength={6}
          type="password"
        />
        <Input
          label="Xác nhận PIN"
          value={confirmPin}
          onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
          inputMode="numeric"
          maxLength={6}
          type="password"
        />
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        {success ? <p className="text-sm text-emerald-400">{success}</p> : null}
        <Button disabled={isPending || pinLocked} onClick={handleSubmit} type="button">
          {isPending ? "Đang lưu…" : pinConfigured ? "Đổi PIN" : "Thiết lập PIN"}
        </Button>
      </div>
    </section>
  );
}
