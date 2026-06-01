"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { studioFinanceEarningDetailAction } from "@/lib/studio/studio-finance-actions";
import type { CreatorEarningTransactionDetail } from "@/types/finance";

function formatVnd(value: number) {
  return `${value.toLocaleString("vi-VN")} ₫`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

type EarningTransactionDetailModalProps = {
  earningTransactionId: string | null;
  onClose: () => void;
};

export function EarningTransactionDetailModal({
  earningTransactionId,
  onClose
}: EarningTransactionDetailModalProps) {
  const [isPending, startTransition] = useTransition();
  const [detail, setDetail] = useState<CreatorEarningTransactionDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!earningTransactionId) {
      setDetail(null);
      setError(null);
      return;
    }
    startTransition(async () => {
      const result = await studioFinanceEarningDetailAction(earningTransactionId);
      if (result.error) {
        setError(result.error);
        setDetail(null);
        return;
      }
      setDetail(result.data);
      setError(null);
    });
  }, [earningTransactionId]);

  if (!earningTransactionId) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="earning-detail-title"
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-zinc-950 p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <h2 id="earning-detail-title" className="text-lg font-bold text-white">
            Chi tiết doanh thu
          </h2>
          <Button type="button" variant="ghost" onClick={onClose}>
            Đóng
          </Button>
        </div>

        {isPending && !detail ? (
          <p className="mt-4 text-sm text-zinc-500">Đang tải…</p>
        ) : null}
        {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}

        {detail ? (
          <div className="mt-4 space-y-4 text-sm">
            <dl className="space-y-2 text-zinc-300">
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">Mã giao dịch</dt>
                <dd className="font-mono text-xs">{detail.id.slice(0, 8)}…</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">Thời gian</dt>
                <dd>{formatDate(detail.created_at)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">Loại</dt>
                <dd>{detail.sourceLabel}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">Nội dung</dt>
                <dd className="text-right">{detail.contentLabel}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">Trạng thái</dt>
                <dd className="capitalize">{detail.status}</dd>
              </div>
            </dl>

            <div className="rounded-xl border border-white/10 bg-zinc-900/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Phân bổ tiền (VND)
              </p>
              <ul className="mt-3 space-y-2">
                {detail.coin_amount != null && detail.coin_to_vnd_rate != null ? (
                  <li className="flex justify-between">
                    <span className="text-zinc-400">Người đọc thanh toán</span>
                    <span>{detail.coin_amount.toLocaleString("vi-VN")} coin</span>
                  </li>
                ) : null}
                {detail.coin_to_vnd_rate != null ? (
                  <li className="flex justify-between">
                    <span className="text-zinc-400">Quy đổi</span>
                    <span>
                      {detail.coin_to_vnd_rate.toLocaleString("vi-VN")} ₫ / coin
                    </span>
                  </li>
                ) : null}
                <li className="flex justify-between">
                  <span className="text-zinc-400">Doanh thu gộp</span>
                  <span>{formatVnd(detail.gross_amount_vnd)}</span>
                </li>
                <li className="flex justify-between text-amber-200/90">
                  <span>ChapMee giữ ({detail.platform_fee_percent ?? "—"}%)</span>
                  <span>−{formatVnd(detail.platform_fee_vnd)}</span>
                </li>
                {detail.payment_processing_fee_vnd > 0 ? (
                  <li className="flex justify-between text-amber-200/90">
                    <span>Phí xử lý / thanh toán (giao dịch cũ)</span>
                    <span>−{formatVnd(detail.payment_processing_fee_vnd)}</span>
                  </li>
                ) : null}
                {detail.tax_or_adjustment_vnd > 0 ? (
                  <li className="flex justify-between text-amber-200/90">
                    <span>Điều chỉnh / thuế</span>
                    <span>−{formatVnd(detail.tax_or_adjustment_vnd)}</span>
                  </li>
                ) : null}
                <li className="flex justify-between border-t border-white/10 pt-2 font-semibold text-emerald-200">
                  <span>Tác giả nhận vào ví</span>
                  <span>{formatVnd(detail.creator_net_amount_vnd)}</span>
                </li>
              </ul>
            </div>

            <dl className="space-y-1 text-xs text-zinc-500">
              {detail.platform_fee_percent != null ? (
                <div>ChapMee giữ: {detail.platform_fee_percent}%</div>
              ) : null}
              {detail.creator_revenue_share_percent != null ? (
                <div>Bạn nhận: {detail.creator_revenue_share_percent}%</div>
              ) : null}
              <div className="text-zinc-600">
                Tính theo chính sách tại thời điểm giao dịch (đã lưu snapshot).
              </div>
            </dl>
          </div>
        ) : null}
      </div>
    </div>
  );
}
