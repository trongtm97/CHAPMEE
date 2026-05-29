"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui";
import {
  confirmQualityCoinRefundAction,
  createQualityRefundBatchAction,
  previewQualityRefundAction,
  setFreeAndRefundQualityAction
} from "@/lib/admin/quality-monetization-actions";
import {
  QUALITY_REFUND_CONFIRM_COIN_THRESHOLD,
  QUALITY_REFUND_REASON_LABELS,
  QUALITY_REFUND_SCOPE_LABELS
} from "@/lib/admin/quality-refund-constants";
import type {
  QualityRefundPreview,
  QualityRefundPurchaseScope,
  QualityRefundReasonCode,
  QualityRefundScope
} from "@/types/quality-refund";

type QualityCoinRefundModalProps = {
  open: boolean;
  storyId: string;
  storyTitle: string;
  mode: "refund" | "free_and_refund";
  onClose: () => void;
  onSuccess: (message: string) => void;
};

export function QualityCoinRefundModal({
  open,
  storyId,
  storyTitle,
  mode,
  onClose,
  onSuccess
}: QualityCoinRefundModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [refundScope, setRefundScope] = useState<QualityRefundScope>("all_purchases");
  const [refundPercent, setRefundPercent] = useState<number>(100);
  const [customPercent, setCustomPercent] = useState("");
  const [purchaseScope, setPurchaseScope] =
    useState<QualityRefundPurchaseScope>("whole_story");
  const [reasonCode, setReasonCode] = useState<QualityRefundReasonCode>("quality_low");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [preview, setPreview] = useState<QualityRefundPreview | null>(null);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [adminNote, setAdminNote] = useState("");
  const [authorNote, setAuthorNote] = useState("");
  const [notifyAuthor, setNotifyAuthor] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) {
      setStep(1);
      setPreview(null);
      setBatchId(null);
      setConfirmChecked(false);
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  const effectivePercent =
    refundPercent === -1 ? Number(customPercent) || 0 : refundPercent;

  function buildInput() {
    return {
      storyId,
      refundScope,
      dateFrom: dateFrom || null,
      dateTo: dateTo || null,
      refundPercent: effectivePercent > 0 ? effectivePercent : null,
      refundFixedAmount: null as number | null,
      purchaseScope,
      reasonCode
    };
  }

  function handlePreview() {
    setError(null);
    startTransition(async () => {
      const result = await previewQualityRefundAction(buildInput());
      if (!result.data) {
        setError(result.error ?? "Không tạo được preview.");
        return;
      }
      setPreview(result.data);
      if (result.data.items.length === 0) {
        setError(result.data.emptyMessage ?? "Không có giao dịch để hoàn.");
        return;
      }
      setStep(2);
    });
  }

  function handleConfirm() {
    setError(null);
    if (!confirmChecked) {
      setError("Bạn cần xác nhận hiểu rõ thao tác hoàn coin.");
      return;
    }
    if (
      preview &&
      preview.totalCoinRefund > QUALITY_REFUND_CONFIRM_COIN_THRESHOLD &&
      !adminNote.trim()
    ) {
      setError(
        `Tổng coin hoàn vượt ${QUALITY_REFUND_CONFIRM_COIN_THRESHOLD.toLocaleString("vi-VN")}, cần ghi chú bắt buộc.`
      );
      return;
    }

    startTransition(async () => {
      if (mode === "free_and_refund") {
        const result = await setFreeAndRefundQualityAction({
          storyId,
          freeReason: "quality_low",
          authorNote: authorNote.trim() || null,
          adminNote: adminNote.trim() || null,
          notifyAuthor,
          refundScope,
          refundPercent: effectivePercent,
          purchaseScope,
          refundReasonCode: reasonCode,
          confirmChecked,
          refundAdminNote: adminNote.trim()
        });
        if (!result.ok) {
          setError(result.error ?? "Hoàn coin thất bại.");
          return;
        }
        onSuccess("Đã mở miễn phí và hoàn coin.");
        onClose();
        return;
      }

      let activeBatchId = batchId;
      if (!activeBatchId) {
        const created = await createQualityRefundBatchAction({
          ...buildInput(),
          adminNote: adminNote.trim() || null
        });
        if (!created.ok || !created.batchId) {
          setError(created.error ?? "Không tạo batch.");
          return;
        }
        activeBatchId = created.batchId;
        setBatchId(activeBatchId);
      }

      const confirmed = await confirmQualityCoinRefundAction({
        batchId: activeBatchId,
        confirmChecked,
        adminNote: adminNote.trim(),
        authorNote: authorNote.trim() || null,
        notifyAuthor
      });

      if (!confirmed.ok) {
        setError(confirmed.error ?? "Xác nhận hoàn coin thất bại.");
        return;
      }

      onSuccess(
        confirmed.error
          ? `Hoàn coin một phần: ${confirmed.successCount} thành công.`
          : `Đã hoàn coin cho ${confirmed.successCount} giao dịch.`
      );
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-white/10 bg-[#0c1118] p-5 shadow-2xl">
        <h3 className="text-lg font-bold text-white">
          {mode === "free_and_refund" ? "Mở miễn phí + hoàn coin" : "Hoàn coin cho người mua"}
        </h3>
        <p className="mt-1 text-sm text-zinc-400">{storyTitle}</p>
        <p className="mt-2 text-xs text-zinc-500">
          Bước {step}/2 · Nếu hệ thống không phân biệt loại coin gốc, coin hoàn được ghi nhận
          theo loại paid/bonus tương ứng giao dịch mua.
        </p>

        {step === 1 ? (
          <div className="mt-4 space-y-4">
            <label className="block text-sm text-zinc-300">
              Phạm vi hoàn
              <select
                className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm"
                onChange={(e) => setRefundScope(e.target.value as QualityRefundScope)}
                value={refundScope}
              >
                {Object.entries(QUALITY_REFUND_SCOPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            {refundScope === "custom_range" ? (
              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm text-zinc-300">
                  Từ ngày
                  <input
                    className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm"
                    onChange={(e) => setDateFrom(e.target.value)}
                    type="date"
                    value={dateFrom}
                  />
                </label>
                <label className="text-sm text-zinc-300">
                  Đến ngày
                  <input
                    className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm"
                    onChange={(e) => setDateTo(e.target.value)}
                    type="date"
                    value={dateTo}
                  />
                </label>
              </div>
            ) : null}

            <label className="block text-sm text-zinc-300">
              Mức hoàn
              <select
                className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm"
                onChange={(e) => setRefundPercent(Number(e.target.value))}
                value={refundPercent}
              >
                <option value={100}>Hoàn 100%</option>
                <option value={50}>Hoàn 50%</option>
                <option value={-1}>Hoàn % tùy chỉnh</option>
              </select>
            </label>

            {refundPercent === -1 ? (
              <input
                className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm"
                max={100}
                min={1}
                onChange={(e) => setCustomPercent(e.target.value)}
                placeholder="% hoàn"
                type="number"
                value={customPercent}
              />
            ) : null}

            <label className="block text-sm text-zinc-300">
              Đối tượng mua
              <select
                className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm"
                onChange={(e) =>
                  setPurchaseScope(e.target.value as QualityRefundPurchaseScope)
                }
                value={purchaseScope}
              >
                <option value="whole_story">Người mua cả truyện</option>
                <option value="chapter_only">Chỉ chapter trả phí (nếu có)</option>
              </select>
            </label>

            <label className="block text-sm text-zinc-300">
              Lý do hoàn
              <select
                className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm"
                onChange={(e) => setReasonCode(e.target.value as QualityRefundReasonCode)}
                value={reasonCode}
              >
                {Object.entries(QUALITY_REFUND_REASON_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <p className="text-xs text-zinc-500">Tip không được hoàn trong flow này.</p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {preview ? (
              <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm text-zinc-300">
                <p>Người được hoàn: {preview.userCount}</p>
                <p>Giao dịch: {preview.transactionCount}</p>
                <p>Tổng coin hoàn: {preview.totalCoinRefund.toLocaleString("vi-VN")}</p>
                <p>Paid coin: {preview.totalPaidCoinRefund.toLocaleString("vi-VN")}</p>
                <p>Bonus coin: {preview.totalBonusCoinRefund.toLocaleString("vi-VN")}</p>
                {preview.duplicateWarning ? (
                  <p className="mt-2 text-amber-200">
                    Có {preview.previouslyRefundedCount} giao dịch đã từng được hoàn — đã loại
                    khỏi batch.
                  </p>
                ) : null}
              </div>
            ) : null}

            <label className="flex items-start gap-2 text-sm text-zinc-300">
              <input
                checked={confirmChecked}
                onChange={(e) => setConfirmChecked(e.target.checked)}
                type="checkbox"
              />
              Tôi hiểu thao tác này sẽ tạo giao dịch hoàn coin cho người dùng và không sửa lịch
              sử mua cũ.
            </label>

            <label className="block text-sm text-zinc-300">
              Ghi chú cho tác giả
              <textarea
                className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm"
                onChange={(e) => setAuthorNote(e.target.value)}
                rows={2}
                value={authorNote}
              />
            </label>

            <label className="block text-sm text-zinc-300">
              Ghi chú admin {preview && preview.totalCoinRefund > QUALITY_REFUND_CONFIRM_COIN_THRESHOLD ? "(bắt buộc)" : ""}
              <textarea
                className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm"
                onChange={(e) => setAdminNote(e.target.value)}
                rows={2}
                value={adminNote}
              />
            </label>

            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                checked={notifyAuthor}
                onChange={(e) => setNotifyAuthor(e.target.checked)}
                type="checkbox"
              />
              Gửi thông báo cho tác giả
            </label>
          </div>
        )}

        {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}

        <div className="mt-5 flex justify-end gap-2">
          <Button
            disabled={pending}
            onClick={() => (step === 2 ? setStep(1) : onClose())}
            type="button"
            variant="ghost"
          >
            {step === 2 ? "Quay lại" : "Hủy"}
          </Button>
          {step === 1 ? (
            <Button disabled={pending} onClick={handlePreview} type="button">
              Xem preview
            </Button>
          ) : (
            <Button disabled={pending} onClick={handleConfirm} type="button" variant="danger">
              Xác nhận hoàn coin
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
