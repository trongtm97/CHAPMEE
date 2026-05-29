"use client";

import { useMemo, useState, useTransition } from "react";
import {
  CoinDangerConfirmModal,
  type CoinDangerConfirmPayload
} from "@/components/admin/CoinDangerConfirmModal";
import {
  confirmBulkGrantCoinsAction,
  validateBulkCoinLinesAction,
  ADMIN_COIN_DANGER_CONFIRM_TEXT
} from "@/lib/admin/coin-wallet-actions";
import { formatAdminCoinReason } from "@/lib/admin/coin-reasons";
import { COIN_ADMIN_COPY } from "@/components/admin/coin-form-copy";
import { Button, Card, Textarea } from "@/components/ui";
import type { BulkCoinLinePreview, BulkCoinValidateResult } from "@/types/coins";

type BulkCoinAdjustmentProps = {
  limits: {
    maxPerUserPerAction: number;
    maxBatchUsers: number;
    maxBatchTotalCoins: number;
  };
  onSuccess?: () => void;
};

export function BulkCoinAdjustment({ limits, onSuccess }: BulkCoinAdjustmentProps) {
  const [raw, setRaw] = useState("");
  const [validation, setValidation] = useState<BulkCoinValidateResult | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [dangerModal, setDangerModal] = useState<CoinDangerConfirmPayload | null>(null);
  const [isPending, startTransition] = useTransition();

  const lines = validation?.lines ?? [];
  const allValid = lines.length > 0 && lines.every((line) => line.valid);
  const hasPreview = lines.length > 0;

  const paidWarning = useMemo(
    () => validation?.hasPaidCoin && (validation?.totals.paid ?? 0) > 0,
    [validation]
  );

  function validateList() {
    startTransition(async () => {
      const result = await validateBulkCoinLinesAction(raw);
      setValidation(result);
      setMessage(result.error);
    });
  }

  function requestConfirm() {
    if (!allValid || !validation) {
      setMessage("Tất cả dòng phải hợp lệ trước khi xác nhận.");
      return;
    }

    setDangerModal({
      title: "Xác nhận cấp coin hàng loạt",
      coinType: validation.hasPaidCoin ? "paid" : "bonus",
      amount: validation.totals.paid + validation.totals.bonus,
      reason: "Cấp hàng loạt theo danh sách đã kiểm tra",
      isBulk: true,
      bulkSummary: `Tổng ${lines.length} user · Coin nạp: ${validation.totals.paid.toLocaleString("vi-VN")} · Coin thưởng: ${validation.totals.bonus.toLocaleString("vi-VN")}`
    });
  }

  function executeBulk() {
    startTransition(async () => {
      const result = await confirmBulkGrantCoinsAction(raw, ADMIN_COIN_DANGER_CONFIRM_TEXT);
      if (result.ok) {
        setMessage(result.message ?? "Đã cấp coin hàng loạt.");
        setRaw("");
        setValidation(null);
        setDangerModal(null);
        onSuccess?.();
      } else {
        setMessage(result.error ?? "Không thể cấp hàng loạt.");
      }
    });
  }

  return (
    <>
      <Card className="space-y-3">
        <p className="text-sm font-semibold text-white">Cấp coin hàng loạt</p>
        <p className="text-xs text-zinc-500">{COIN_ADMIN_COPY.bulkFormatHint}</p>
        <div className="rounded-lg border border-white/10 bg-zinc-950/60 p-2 font-mono text-[11px] text-zinc-400">
          <p>{COIN_ADMIN_COPY.bulkExample1}</p>
          <p>{COIN_ADMIN_COPY.bulkExample2}</p>
        </div>

        {paidWarning ? (
          <p className="rounded-lg border border-amber-400/35 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
            {COIN_ADMIN_COPY.paidWarning}
          </p>
        ) : null}

        <Textarea
          className="min-h-28 font-mono text-sm"
          onChange={(event) => {
            setRaw(event.target.value);
            setValidation(null);
          }}
          placeholder="username_or_email, coin_type, amount, reason"
          value={raw}
        />

        <div className="flex flex-wrap gap-2">
          <Button disabled={isPending || !raw.trim()} onClick={validateList} type="button" variant="secondary">
            {isPending ? "Đang kiểm tra…" : "Kiểm tra danh sách"}
          </Button>
          <Button disabled={isPending || !allValid} onClick={requestConfirm} type="button">
            Xác nhận cấp hàng loạt
          </Button>
        </div>

        {hasPreview ? (
          <>
            {validation ? (
              <p className="text-xs text-zinc-400">
                Tổng coin nạp: {validation.totals.paid.toLocaleString("vi-VN")} · Tổng coin thưởng:{" "}
                {validation.totals.bonus.toLocaleString("vi-VN")}
              </p>
            ) : null}
            <BulkPreviewTable lines={lines} />
          </>
        ) : (
          <p className="text-xs text-zinc-500">{COIN_ADMIN_COPY.noBulkPreview}</p>
        )}

        {message ? <p className="text-sm text-cyan-200">{message}</p> : null}
      </Card>

      <CoinDangerConfirmModal
        onClose={() => setDangerModal(null)}
        onConfirmed={executeBulk}
        open={Boolean(dangerModal)}
        payload={dangerModal}
        pending={isPending}
      />
    </>
  );
}

function BulkPreviewTable({ lines }: { lines: BulkCoinLinePreview[] }) {
  return (
    <div className="max-h-64 overflow-auto rounded-lg border border-white/10">
      <table className="min-w-full text-left text-xs">
        <thead className="sticky top-0 bg-zinc-950 text-zinc-500">
          <tr>
            <th className="px-2 py-1.5">#</th>
            <th className="px-2 py-1.5">User</th>
            <th className="px-2 py-1.5">Loại</th>
            <th className="px-2 py-1.5">SL</th>
            <th className="px-2 py-1.5">Lý do</th>
            <th className="px-2 py-1.5">TT</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <tr className="border-t border-white/5" key={line.line}>
              <td className="px-2 py-1.5 text-zinc-500">{line.line}</td>
              <td className="px-2 py-1.5">{line.userLabel ?? line.usernameOrEmail}</td>
              <td className="px-2 py-1.5">{line.coinType ?? "—"}</td>
              <td className="px-2 py-1.5">
                {line.amount != null ? line.amount.toLocaleString("vi-VN") : "—"}
              </td>
              <td className="px-2 py-1.5">
                {line.reasonCode ? formatAdminCoinReason(line.reasonCode) : "—"}
              </td>
              <td className="px-2 py-1.5">
                {line.valid ? (
                  <span className="text-emerald-300">OK</span>
                ) : (
                  <span className="text-red-300">{line.error}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
