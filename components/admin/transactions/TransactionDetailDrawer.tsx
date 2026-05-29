"use client";

import Link from "next/link";
import { useEffect } from "react";
import {
  formatCoinAmount,
  formatVndAmount,
  transactionSourceLabel,
  transactionTypeLabel
} from "@/lib/admin/transactions/transaction-labels";
import type { AdminTransactionDetail } from "@/types/admin-transaction";
import {
  TransactionRiskBadge,
  TransactionSourceBadge,
  TransactionStatusBadge
} from "@/components/admin/transactions/TransactionBadges";
import { Button } from "@/components/ui";

type Props = {
  open: boolean;
  detail: AdminTransactionDetail | null;
  loading?: boolean;
  error?: string | null;
  canCreateRefund?: boolean;
  onClose: () => void;
};

function MoneyRow({ label, value }: { label: string; value: string }) {
  return (
    <tr className="border-t border-white/5">
      <td className="px-2 py-2 text-zinc-500">{label}</td>
      <td className="px-2 py-2 text-right text-zinc-200">{value}</td>
    </tr>
  );
}

function formatMaybeVnd(value: number | null) {
  return value == null ? "—" : formatVndAmount(value);
}

function formatMaybeCoin(value: number | null) {
  return value == null ? "—" : value.toLocaleString("vi-VN");
}

export function TransactionDetailDrawer({
  open,
  detail,
  loading,
  error,
  canCreateRefund = false,
  onClose
}: Props) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const storyHref =
    detail?.storySlug && detail.story_id
      ? `/truyen/${detail.storySlug}`
      : detail?.story_id
        ? `/admin/content/stories/${detail.story_id}`
        : null;
  const chapterHref =
    detail?.storySlug && detail.episodeNumber
      ? `/truyen/${detail.storySlug}/chuong/${detail.episodeNumber}`
      : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end md:items-stretch">
      <button
        aria-label="Đóng"
        className="absolute inset-0 bg-black/55 backdrop-blur-[1px]"
        onClick={onClose}
        type="button"
      />
      <div className="relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-[#0b1016] shadow-2xl md:max-h-full md:max-w-[680px] md:rounded-none md:border-l md:border-t-0">
        <div className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-cyan-300">Chi tiết giao dịch</p>
            <h2 className="mt-1 font-mono text-sm text-white">
              {detail?.transaction_code ?? "Đang tải…"}
            </h2>
          </div>
          <Button onClick={onClose} type="button" variant="ghost">
            Đóng
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading && !detail ? (
            <p className="text-sm text-zinc-500">Đang tải chi tiết giao dịch…</p>
          ) : null}
          {error ? <p className="text-sm text-rose-300">{error}</p> : null}

          {detail ? (
            <div className="space-y-6 text-sm">
              <section className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-500">
                  Tổng quan giao dịch
                </h3>
                <dl className="grid gap-2 sm:grid-cols-2">
                  <DetailItem label="Mã giao dịch" value={detail.transaction_code} />
                  <DetailItem
                    label="Trạng thái"
                    value={<TransactionStatusBadge status={detail.status} />}
                  />
                  <DetailItem label="Loại giao dịch" value={transactionTypeLabel(detail.type)} />
                  <DetailItem
                    label="Nguồn"
                    value={
                      <TransactionSourceBadge provider={detail.provider} source={detail.source} />
                    }
                  />
                  <DetailItem
                    label="Thời gian tạo"
                    value={new Date(detail.created_at).toLocaleString("vi-VN")}
                  />
                  <DetailItem
                    label="Thời gian cập nhật"
                    value={new Date(detail.updated_at).toLocaleString("vi-VN")}
                  />
                  <DetailItem label="Người thực hiện" value={detail.performerLabel ?? "—"} />
                  <DetailItem label="Người nhận" value={detail.recipientLabel ?? "—"} />
                </dl>
                {detail.needsReview ? (
                  <div className="rounded-xl border border-orange-400/20 bg-orange-400/5 px-3 py-2">
                    <p className="text-xs text-orange-200">Cảnh báo</p>
                    <div className="mt-1">
                      <TransactionRiskBadge reasons={detail.riskReasons} />
                    </div>
                  </div>
                ) : null}
              </section>

              <section className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-500">
                  Dòng tiền
                </h3>
                <div className="overflow-x-auto rounded-xl border border-white/10">
                  <table className="min-w-full text-sm">
                    <tbody>
                      <MoneyRow
                        label="Số tiền gốc"
                        value={formatMaybeVnd(detail.moneyFlow.grossAmountVnd)}
                      />
                      <MoneyRow
                        label="Phí thanh toán"
                        value={formatMaybeVnd(detail.moneyFlow.providerFeeVnd)}
                      />
                      <MoneyRow
                        label="Phí nền tảng"
                        value={formatMaybeVnd(detail.moneyFlow.platformFeeVnd)}
                      />
                      <MoneyRow
                        label="Coin paid"
                        value={formatMaybeCoin(detail.moneyFlow.paidCoinAmount)}
                      />
                      <MoneyRow
                        label="Coin bonus"
                        value={formatMaybeCoin(detail.moneyFlow.bonusCoinAmount)}
                      />
                      <MoneyRow
                        label="Creator gross"
                        value={formatMaybeVnd(detail.moneyFlow.creatorGrossVnd)}
                      />
                      <MoneyRow
                        label="Creator net"
                        value={formatMaybeVnd(detail.moneyFlow.creatorNetVnd)}
                      />
                      <MoneyRow
                        label="Platform revenue"
                        value={formatMaybeVnd(detail.moneyFlow.platformRevenueVnd)}
                      />
                      <MoneyRow
                        label="Số dư ví trước giao dịch"
                        value={formatMaybeCoin(detail.moneyFlow.walletBalanceBefore)}
                      />
                      <MoneyRow
                        label="Số dư ví sau giao dịch"
                        value={formatMaybeCoin(detail.moneyFlow.walletBalanceAfter)}
                      />
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-zinc-500">
                  Coin giao dịch: {formatCoinAmount(detail.coin_amount, detail.direction)} · Tiền:{" "}
                  {formatVndAmount(detail.money_amount_vnd)}
                </p>
              </section>

              {(detail.story_id || detail.chapter_id || detail.relatedContent) && (
                <section className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-500">
                    Nội dung liên quan
                  </h3>
                  <dl className="space-y-2">
                    <DetailItem label="Truyện" value={detail.relatedContent?.split(" · ")[0] ?? "—"} />
                    <DetailItem
                      label="Chương"
                      value={detail.relatedContent?.split(" · ").slice(1).join(" · ") || "—"}
                    />
                    <DetailItem label="Tác giả" value={detail.creatorLabel ?? "—"} />
                  </dl>
                  <div className="flex flex-wrap gap-2">
                    {storyHref ? (
                      <Link
                        className="text-sm font-semibold text-cyan-300 hover:text-cyan-200"
                        href={storyHref}
                        rel="noreferrer"
                        target="_blank"
                      >
                        Mở truyện ↗
                      </Link>
                    ) : null}
                    {chapterHref ? (
                      <Link
                        className="text-sm font-semibold text-cyan-300 hover:text-cyan-200"
                        href={chapterHref}
                        rel="noreferrer"
                        target="_blank"
                      >
                        Mở chương ↗
                      </Link>
                    ) : null}
                  </div>
                </section>
              )}

              <section className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-500">
                  Hoàn tiền / đảo giao dịch
                </h3>
                <dl className="grid gap-2 sm:grid-cols-2">
                  <DetailItem
                    label="Có được hoàn không?"
                    value={detail.refundInfo.canRefund ? "Có" : "Không"}
                  />
                  <DetailItem
                    label="Đã hoàn bao nhiêu coin?"
                    value={
                      detail.refundInfo.refundedCoin != null
                        ? detail.refundInfo.refundedCoin.toLocaleString("vi-VN")
                        : "—"
                    }
                  />
                  <DetailItem
                    label="Có chargeback không?"
                    value={detail.refundInfo.hasChargeback ? "Có" : "Không"}
                  />
                  <DetailItem label="Người xử lý" value={detail.refundInfo.processedBy ?? "—"} />
                  <DetailItem
                    className="sm:col-span-2"
                    label="Lý do"
                    value={detail.refundInfo.reason ?? "—"}
                  />
                </dl>
                <div className="flex flex-wrap gap-2">
                  {canCreateRefund && detail.refundInfo.canRefund && detail.id ? (
                    <Link
                      className="inline-flex rounded-xl bg-cyan-600 px-3 py-2 text-sm font-semibold text-white hover:bg-cyan-500"
                      href={`/admin/refunds?create=1&tx=${detail.id}${detail.user_id ? `&userId=${detail.user_id}` : ""}`}
                    >
                      Tạo hoàn tiền
                    </Link>
                  ) : null}
                  {detail.id ? (
                    <Link
                      className="inline-flex rounded-xl border border-white/10 px-3 py-2 text-sm text-cyan-300 hover:border-cyan-400/40"
                      href={`/admin/refunds?q=${detail.id}`}
                    >
                      Xem lịch sử hoàn
                    </Link>
                  ) : null}
                </div>
                {!canCreateRefund ? (
                  <p className="text-xs text-zinc-500">
                    Cần quyền tài chính (finance.refund.create) để tạo hoàn tiền từ giao dịch này.
                  </p>
                ) : null}
              </section>

              <section className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-500">
                  Audit log
                </h3>
                {detail.auditLog.length === 0 ? (
                  <p className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-4 text-zinc-500">
                    Chưa có audit log cho giao dịch này.
                  </p>
                ) : (
                  <ol className="space-y-3 border-l border-white/10 pl-4">
                    {detail.auditLog.map((entry) => (
                      <li className="relative" key={entry.id}>
                        <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-cyan-400" />
                        <p className="font-medium text-zinc-200">{entry.label}</p>
                        {entry.at ? (
                          <p className="text-xs text-zinc-500">
                            {new Date(entry.at).toLocaleString("vi-VN")}
                          </p>
                        ) : null}
                        {entry.detail ? (
                          <p className="mt-0.5 text-xs text-zinc-400">{entry.detail}</p>
                        ) : null}
                      </li>
                    ))}
                  </ol>
                )}
              </section>

              <section className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-3 text-xs text-zinc-500">
                Nguồn: {transactionSourceLabel(detail.source, detail.provider)}
                {detail.provider_reference
                  ? ` · Ref: ${detail.provider_reference}`
                  : null}
              </section>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function DetailItem({
  label,
  value,
  className = ""
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className="mt-0.5 text-zinc-200">{value}</dd>
    </div>
  );
}
