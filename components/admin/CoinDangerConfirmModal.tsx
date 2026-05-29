"use client";

import { useState } from "react";
import { ModalShell } from "@/components/admin/username-policy/ModalShell";
import { ADMIN_COIN_DANGER_CONFIRM_TEXT } from "@/lib/admin/coin-danger";
import { COIN_ADMIN_COPY } from "@/components/admin/coin-form-copy";
import { Button } from "@/components/ui";

export type CoinDangerConfirmPayload = {
  title: string;
  userLabel?: string;
  coinType: "paid" | "bonus";
  direction?: "credit" | "debit";
  amount: number;
  reason: string;
  note?: string;
  impact?: string;
  isBulk?: boolean;
  bulkSummary?: string;
};

type CoinDangerConfirmModalProps = {
  open: boolean;
  payload: CoinDangerConfirmPayload | null;
  onClose: () => void;
  onConfirmed: () => void;
  pending?: boolean;
};

export function CoinDangerConfirmModal({
  open,
  payload,
  onClose,
  onConfirmed,
  pending
}: CoinDangerConfirmModalProps) {
  const [token, setToken] = useState("");

  if (!open || !payload) return null;

  const coinLabel =
    payload.coinType === "paid" ? COIN_ADMIN_COPY.paidLabel : COIN_ADMIN_COPY.bonusLabel;

  return (
    <ModalShell onClose={onClose} title={payload.title} wide>
      <div className="space-y-3 text-sm text-zinc-300">
        {payload.isBulk ? (
          <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-amber-100">
            {payload.bulkSummary ?? "Cấp coin hàng loạt — thao tác không thể hoàn tác dễ dàng."}
          </p>
        ) : null}
        {payload.userLabel ? <p>User: {payload.userLabel}</p> : null}
        {payload.direction ? (
          <p>
            Thao tác: {payload.direction === "credit" ? "Cộng" : "Trừ"} {payload.amount.toLocaleString("vi-VN")}{" "}
            {coinLabel}
          </p>
        ) : (
          <p>
            Số coin: {payload.amount.toLocaleString("vi-VN")} ({coinLabel})
          </p>
        )}
        <p>Lý do: {payload.reason}</p>
        {payload.note ? <p>Ghi chú: {payload.note}</p> : null}
        {payload.impact ? (
          <p className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
            Sau xử lý: {payload.impact}
          </p>
        ) : null}
        {payload.coinType === "paid" ? (
          <p className="text-xs text-amber-200">{COIN_ADMIN_COPY.paidWarning}</p>
        ) : null}
        <label className="block space-y-1">
          <span className="text-zinc-400">
            Gõ <strong className="text-white">{ADMIN_COIN_DANGER_CONFIRM_TEXT}</strong> để xác nhận
          </span>
          <input
            autoComplete="off"
            className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-white"
            onChange={(event) => setToken(event.target.value)}
            value={token}
          />
        </label>
        <div className="flex flex-wrap gap-2 pt-2">
          <Button disabled={pending} onClick={onClose} type="button" variant="ghost">
            Huỷ
          </Button>
          <Button
            disabled={pending || token.trim() !== ADMIN_COIN_DANGER_CONFIRM_TEXT}
            onClick={() => {
              onConfirmed();
              setToken("");
            }}
            type="button"
            variant="danger"
          >
            {pending ? "Đang xử lý…" : "Xác nhận thao tác"}
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}
