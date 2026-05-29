"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { MONETIZATION_STATUS_LABELS } from "@/lib/admin/quality-refund-constants";
import type {
  CoinRefundBatchSummary,
  QualityMonetizationImpact
} from "@/types/quality-refund";

type QualityMonetizationImpactBoxProps = {
  impact: QualityMonetizationImpact | null;
  refundBatches?: CoinRefundBatchSummary[];
  canManageMonetization: boolean;
  canRefund: boolean;
  disabled?: boolean;
  onSetFree: () => void;
  onDisableMonetization: () => void;
  onRefund: () => void;
  onSetFreeAndRefund: () => void;
  onRestorePaid: () => void;
  onViewRefundHistory: () => void;
};

export function QualityMonetizationImpactBox({
  impact,
  refundBatches = [],
  canManageMonetization,
  canRefund,
  disabled,
  onSetFree,
  onDisableMonetization,
  onRefund,
  onSetFreeAndRefund,
  onRestorePaid,
  onViewRefundHistory
}: QualityMonetizationImpactBoxProps) {
  const [historyOpen, setHistoryOpen] = useState(false);

  if (!impact) {
    return (
      <section className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
        <h4 className="text-sm font-medium text-zinc-300">Tác động kiếm tiền</h4>
        <p className="mt-2 text-sm text-zinc-500">Không tải được dữ liệu kiếm tiền.</p>
      </section>
    );
  }

  const statusLabel =
    MONETIZATION_STATUS_LABELS[impact.monetizationStatus] ?? impact.monetizationStatus;

  return (
    <section className="rounded-lg border border-cyan-400/20 bg-cyan-400/5 p-3">
      <h4 className="text-sm font-semibold text-cyan-100">Tác động kiếm tiền</h4>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div>
          <dt className="text-zinc-500">Trạng thái</dt>
          <dd className="font-medium text-zinc-200">{statusLabel}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Người đã mua</dt>
          <dd className="font-medium text-zinc-200">{impact.buyerCount}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Coin đã thu</dt>
          <dd className="font-medium text-zinc-200">
            {impact.totalCoinCollected.toLocaleString("vi-VN")}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Coin đã hoàn</dt>
          <dd className="font-medium text-zinc-200">
            {impact.totalCoinRefunded.toLocaleString("vi-VN")}
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="text-zinc-500">Doanh thu tác giả (NET)</dt>
          <dd className="font-medium text-zinc-200">
            {impact.creatorRevenueVnd.toLocaleString("vi-VN")} ₫
          </dd>
        </div>
        {impact.pendingRefundBatchCount > 0 ? (
          <div className="col-span-2 text-xs text-amber-200">
            Có {impact.pendingRefundBatchCount} batch hoàn coin chưa hoàn tất.
          </div>
        ) : null}
      </dl>

      {!canManageMonetization && !canRefund ? (
        <p className="mt-3 text-xs text-zinc-500">
          Bạn không có quyền thay đổi trạng thái kiếm tiền hoặc hoàn coin.
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-2">
          {canManageMonetization ? (
            <>
              <Button disabled={disabled} onClick={onSetFree} type="button" variant="secondary">
                Mở miễn phí
              </Button>
              <Button
                disabled={disabled}
                onClick={onDisableMonetization}
                type="button"
                variant="secondary"
              >
                Tắt kiếm tiền
              </Button>
              {impact.monetizationStatus === "free_due_to_quality" ||
              impact.monetizationStatus === "disabled_due_to_quality" ? (
                <Button
                  disabled={disabled}
                  onClick={onRestorePaid}
                  type="button"
                  variant="ghost"
                >
                  Khôi phục trả phí
                </Button>
              ) : null}
            </>
          ) : null}
          {canRefund ? (
            <>
              <Button disabled={disabled} onClick={onRefund} type="button">
                Hoàn coin
              </Button>
              {canManageMonetization ? (
                <Button
                  disabled={disabled}
                  onClick={onSetFreeAndRefund}
                  type="button"
                  variant="danger"
                >
                  Miễn phí + hoàn coin
                </Button>
              ) : null}
            </>
          ) : (
            <p className="col-span-2 text-xs text-amber-200">
              Cần quyền tài chính (finance.refund.create) để hoàn coin.
            </p>
          )}
        </div>
      )}

      {refundBatches.length > 0 ? (
        <div className="mt-3">
          <button
            className="text-xs font-semibold text-cyan-300 hover:text-cyan-200"
            onClick={() => {
              setHistoryOpen((v) => !v);
              onViewRefundHistory();
            }}
            type="button"
          >
            {historyOpen ? "Ẩn" : "Xem"} lịch sử hoàn coin ({refundBatches.length})
          </button>
          {historyOpen ? (
            <ul className="mt-2 space-y-2">
              {refundBatches.map((batch) => (
                <li
                  className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-zinc-400"
                  key={batch.id}
                >
                  <span className="font-medium text-zinc-200">{batch.status}</span>
                  {" · "}
                  {batch.totalUsers} người ·{" "}
                  {batch.totalCoinRefunded.toLocaleString("vi-VN")} coin
                  <br />
                  {new Date(batch.createdAt).toLocaleString("vi-VN")}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
