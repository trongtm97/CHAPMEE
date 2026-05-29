"use client";

import { useEffect, useState, useTransition } from "react";
import { Button, Input } from "@/components/ui";
import { previewRefundImpact, createManualRefundRecord } from "@/lib/finance/refunds";
import type { CreateManualRefundPayload, RefundPreviewImpact, RefundType } from "@/types/admin-refund";
import { REFUND_TYPE_FILTER_OPTIONS } from "@/lib/admin/refunds/refund-labels";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  initialTransactionId?: string;
  initialUserId?: string;
  initialCoinAmount?: number;
};

const makeInitial = (overrides?: {
  initialTransactionId?: string;
  initialUserId?: string;
  initialCoinAmount?: number;
}): CreateManualRefundPayload => ({
  userId: overrides?.initialUserId ?? "",
  originalTransactionId: overrides?.initialTransactionId ?? "",
  refundType: "admin_manual_refund",
  coinAmount: overrides?.initialCoinAmount ?? 0,
  coinType: "all",
  reasonPublic: "",
  reasonInternal: "",
  creditBuyerWallet: true,
  reverseCreatorRevenue: true,
  keepContentUnlocked: false,
  revokeContentAccess: false,
  notifyBuyer: true,
  notifyCreator: true
});

export function CreateManualRefundModal({
  open,
  onClose,
  onCreated,
  initialTransactionId = "",
  initialUserId = "",
  initialCoinAmount = 0
}: Props) {
  const [form, setForm] = useState<CreateManualRefundPayload>(() =>
    makeInitial({ initialTransactionId, initialUserId, initialCoinAmount })
  );
  const [preview, setPreview] = useState<RefundPreviewImpact | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewPending, startPreview] = useTransition();
  const [submitPending, startSubmit] = useTransition();

  useEffect(() => {
    if (open) {
      setForm(makeInitial({ initialTransactionId, initialUserId, initialCoinAmount }));
      setPreview(null);
      setError(null);
      return;
    }
    setForm(makeInitial());
    setPreview(null);
    setError(null);
  }, [open, initialTransactionId, initialUserId, initialCoinAmount]);

  if (!open) return null;

  function patch(partial: Partial<CreateManualRefundPayload>) {
    setForm((prev) => ({ ...prev, ...partial }));
  }

  function runPreview() {
    startPreview(async () => {
      setError(null);
      const result = await previewRefundImpact(form);
      if (result.error) {
        setError(result.error);
        return;
      }
      setPreview(result.data);
    });
  }

  function handleSubmit() {
    startSubmit(async () => {
      setError(null);
      const result = await createManualRefundRecord(form);
      if (!result.ok) {
        setError(result.error ?? "Không thể tạo hoàn tiền.");
        return;
      }
      onCreated();
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button aria-label="Đóng" className="absolute inset-0 bg-black/60" onClick={onClose} type="button" />
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-[#0b1016] p-5 shadow-2xl">
        <h3 className="text-lg font-semibold text-white">Tạo hoàn tiền thủ công</h3>
        <p className="mt-1 text-sm text-zinc-400">Admin tạo yêu cầu hoàn coin từ giao dịch gốc.</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Input
            label="User ID / username / email"
            onChange={(e) => patch({ userId: e.target.value })}
            placeholder="UUID hoặc username"
            value={form.userId}
          />
          <Input
            label="Transaction ID gốc"
            onChange={(e) => patch({ originalTransactionId: e.target.value })}
            required
            value={form.originalTransactionId}
          />
          <label className="block space-y-1 sm:col-span-2">
            <span className="text-sm text-zinc-300">Loại hoàn</span>
            <select
              className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white"
              onChange={(e) => patch({ refundType: e.target.value as RefundType })}
              value={form.refundType}
            >
              {REFUND_TYPE_FILTER_OPTIONS.filter((o) => o.value !== "all").map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <Input
            label="Số coin hoàn"
            min={0}
            onChange={(e) => patch({ coinAmount: Number(e.target.value) })}
            required
            type="number"
            value={form.coinAmount || ""}
          />
          <label className="block space-y-1">
            <span className="text-sm text-zinc-300">Coin type</span>
            <select
              className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white"
              onChange={(e) =>
                patch({ coinType: e.target.value as CreateManualRefundPayload["coinType"] })
              }
              value={form.coinType}
            >
              <option value="all">Hoàn đúng loại coin gốc</option>
              <option value="paid_coin">Paid coin</option>
              <option value="bonus_coin">Bonus coin</option>
            </select>
          </label>
          <Input
            className="sm:col-span-2"
            label="Lý do hoàn (bắt buộc)"
            onChange={(e) => patch({ reasonPublic: e.target.value })}
            required
            value={form.reasonPublic}
          />
          <Input
            className="sm:col-span-2"
            label="Ghi chú admin nội bộ"
            onChange={(e) => patch({ reasonInternal: e.target.value })}
            value={form.reasonInternal ?? ""}
          />
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {[
            ["creditBuyerWallet", "Hoàn vào ví người mua"],
            ["reverseCreatorRevenue", "Trừ/đảo doanh thu tác giả"],
            ["keepContentUnlocked", "Mở khóa nội dung vẫn giữ nguyên"],
            ["revokeContentAccess", "Thu hồi quyền đọc sau hoàn"],
            ["notifyBuyer", "Gửi thông báo người mua"],
            ["notifyCreator", "Gửi thông báo tác giả nếu ảnh hưởng doanh thu"]
          ].map(([key, label]) => (
            <label className="flex items-center gap-2 text-sm text-zinc-300" key={key}>
              <input
                checked={form[key as keyof CreateManualRefundPayload] as boolean}
                onChange={(e) => patch({ [key]: e.target.checked } as Partial<CreateManualRefundPayload>)}
                type="checkbox"
              />
              {label}
            </label>
          ))}
        </div>

        {preview ? (
          <div className="mt-4 rounded-xl border border-cyan-400/20 bg-cyan-500/5 p-4 text-sm">
            <p className="font-semibold text-cyan-200">Preview tác động</p>
            <ul className="mt-2 space-y-1 text-zinc-300">
              <li>Người mua nhận: {preview.buyerCreditCoin} coin</li>
              <li>Tác giả bị trừ doanh thu: {preview.creatorRevenueReversalVnd.toLocaleString("vi-VN")} ₫</li>
              <li>Nền tảng đảo doanh thu: {preview.platformRevenueReversalVnd.toLocaleString("vi-VN")} ₫</li>
            </ul>
            {preview.ledgerEntries.length > 0 ? (
              <div className="mt-2">
                <p className="text-xs text-zinc-500">Ledger entries:</p>
                <ul className="mt-1 text-xs text-zinc-400">
                  {preview.ledgerEntries.map((e, i) => (
                    <li key={i}>
                      {e.type} · {e.direction} · {e.amount} → {e.target}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {preview.warnings.length > 0 ? (
              <ul className="mt-2 text-xs text-amber-300">
                {preview.warnings.map((w) => (
                  <li key={w}>⚠ {w}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button onClick={onClose} type="button" variant="secondary">
            Huỷ
          </Button>
          <Button loading={previewPending} onClick={runPreview} type="button" variant="secondary">
            Xem preview
          </Button>
          <Button
            disabled={preview ? !preview.canSubmit : false}
            loading={submitPending}
            onClick={handleSubmit}
            type="button"
          >
            Tạo hoàn tiền
          </Button>
        </div>
      </div>
    </div>
  );
}
