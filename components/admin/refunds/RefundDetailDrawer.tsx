"use client";

import Link from "next/link";
import { useEffect } from "react";
import {
  formatCoin,
  formatRefundId,
  formatVnd,
  refundSourceLabel,
  refundTypeLabel
} from "@/lib/admin/refunds/refund-labels";
import type { AdminRefundDetail, RefundAdminCapabilities } from "@/types/admin-refund";
import { RefundStatusBadge } from "@/components/admin/refunds/RefundBadges";
import { Button } from "@/components/ui";

export type RefundDetailAction =
  | "approve"
  | "reject"
  | "processing"
  | "complete"
  | "failed"
  | "add_note";

type Props = {
  open: boolean;
  detail: AdminRefundDetail | null;
  loading?: boolean;
  error?: string | null;
  pending?: boolean;
  capabilities: RefundAdminCapabilities;
  onClose: () => void;
  onAction: (action: RefundDetailAction) => void;
  onAddNote: (note: string) => void;
};

export function RefundDetailDrawer({
  open,
  detail,
  loading,
  error,
  pending,
  capabilities,
  onClose,
  onAction,
  onAddNote
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

  const refund = detail?.refund;
  const status = refund?.status ?? "pending";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end md:items-stretch">
      <button
        aria-label="Đóng"
        className="absolute inset-0 bg-black/55"
        onClick={onClose}
        type="button"
      />
      <div className="relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-[#0b1016] shadow-2xl md:max-h-full md:max-w-[720px] md:rounded-none md:border-l">
        <div className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-cyan-300">Chi tiết hoàn tiền</p>
            <h2 className="mt-1 font-mono text-sm text-white">
              {refund ? formatRefundId(refund.id) : "Đang tải…"}
            </h2>
            {refund ? (
              <div className="mt-2">
                <RefundStatusBadge status={refund.status} />
              </div>
            ) : null}
          </div>
          <Button onClick={onClose} type="button" variant="ghost">
            Đóng
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 text-sm">
          {loading && !detail ? <p className="text-zinc-500">Đang tải chi tiết…</p> : null}
          {error ? <p className="text-rose-300">{error}</p> : null}

          {detail && refund ? (
            <div className="space-y-6">
              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase text-zinc-500">Người mua</h3>
                <dl className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <dt className="text-zinc-500">Username</dt>
                    <dd>{detail.buyer.username ? `@${detail.buyer.username}` : "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">User ID</dt>
                    <dd className="font-mono text-xs">{detail.buyer.userId ?? "—"}</dd>
                  </div>
                  {detail.buyer.userId ? (
                    <div className="sm:col-span-2">
                      <Link
                        className="text-cyan-300 hover:text-cyan-200"
                        href={`/admin/coins?userId=${detail.buyer.userId}`}
                      >
                        Mở ví người dùng →
                      </Link>
                    </div>
                  ) : null}
                </dl>
              </section>

              {detail.creator.userId ? (
                <section className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase text-zinc-500">Tác giả liên quan</h3>
                  <p>
                    {detail.creator.displayName ?? detail.creator.username ?? detail.creator.userId}
                  </p>
                </section>
              ) : null}

              {detail.originalTransaction ? (
                <section className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase text-zinc-500">Giao dịch gốc</h3>
                  <dl className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <dt className="text-zinc-500">Transaction ID</dt>
                      <dd className="font-mono text-xs">{detail.originalTransaction.id}</dd>
                    </div>
                    <div>
                      <dt className="text-zinc-500">Loại</dt>
                      <dd>{detail.originalTransaction.type}</dd>
                    </div>
                    <div>
                      <dt className="text-zinc-500">Coin</dt>
                      <dd>{formatCoin(detail.originalTransaction.coinAmount ?? 0)}</dd>
                    </div>
                    <div>
                      <dt className="text-zinc-500">Paid / Bonus</dt>
                      <dd>
                        {detail.originalTransaction.paidCoinAmount ?? 0} /{" "}
                        {detail.originalTransaction.bonusCoinAmount ?? 0}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-zinc-500">VND</dt>
                      <dd>{formatVnd(detail.originalTransaction.moneyAmountVnd)}</dd>
                    </div>
                    <div>
                      <dt className="text-zinc-500">Thời gian</dt>
                      <dd>{new Date(detail.originalTransaction.createdAt).toLocaleString("vi-VN")}</dd>
                    </div>
                  </dl>
                  <Link
                    className="text-cyan-300 hover:text-cyan-200"
                    href={`/admin/transactions?id=${detail.originalTransaction.id}`}
                  >
                    Mở chi tiết giao dịch →
                  </Link>
                </section>
              ) : null}

              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase text-zinc-500">Nội dung liên quan</h3>
                <dl className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <dt className="text-zinc-500">Truyện</dt>
                    <dd>{detail.content.storyTitle ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Chương</dt>
                    <dd>{detail.content.chapterTitle ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Trạng thái nội dung</dt>
                    <dd>{detail.content.contentStatus ?? "—"}</dd>
                  </div>
                </dl>
                {detail.content.storyId ? (
                  <Link
                    className="text-cyan-300 hover:text-cyan-200"
                    href={`/admin/content-quality?story=${detail.content.storyId}`}
                  >
                    Mở content quality →
                  </Link>
                ) : null}
              </section>

              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase text-zinc-500">Thông tin hoàn</h3>
                <dl className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <dt className="text-zinc-500">Loại hoàn</dt>
                    <dd>{refundTypeLabel(refund.refundType)}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Nguồn</dt>
                    <dd>{refundSourceLabel(refund.source)}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Coin hoàn</dt>
                    <dd className="font-semibold text-white">{formatCoin(refund.coinAmount ?? 0)}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Lý do</dt>
                    <dd>{refund.reasonPublic ?? refund.reason ?? "—"}</dd>
                  </div>
                </dl>
              </section>

              {detail.evidence ? (
                <section className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase text-zinc-500">Bằng chứng / khiếu nại</h3>
                  <p className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-zinc-300">
                    {detail.evidence}
                  </p>
                </section>
              ) : null}

              {detail.processingHistory.length > 0 ? (
                <section className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase text-zinc-500">Lịch sử xử lý</h3>
                  <ul className="space-y-2">
                    {detail.processingHistory.map((entry) => (
                      <li
                        className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2"
                        key={entry.id}
                      >
                        <p className="font-medium text-white">{entry.label}</p>
                        <p className="text-xs text-zinc-500">
                          {new Date(entry.at).toLocaleString("vi-VN")}
                          {entry.actorUsername ? ` · @${entry.actorUsername}` : ""}
                        </p>
                        {entry.detail ? <p className="mt-1 text-zinc-400">{entry.detail}</p> : null}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {capabilities.canViewAudit && detail.auditLog.length > 0 ? (
                <section className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase text-zinc-500">Audit log</h3>
                  <ul className="max-h-40 space-y-1 overflow-y-auto text-xs text-zinc-400">
                    {detail.auditLog.map((a) => (
                      <li key={a.id}>
                        {a.action} · {a.actorUsername ?? "system"} ·{" "}
                        {new Date(a.at).toLocaleString("vi-VN")}
                      </li>
                    ))}
                  </ul>
                  <Link
                    className="text-cyan-300 hover:text-cyan-200"
                    href={`/admin/audit?action=refund`}
                  >
                    Xem toàn bộ nhật ký hoàn tiền →
                  </Link>
                </section>
              ) : null}

              {refund.reasonInternal ? (
                <section className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase text-zinc-500">Ghi chú nội bộ</h3>
                  <pre className="whitespace-pre-wrap rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs text-zinc-400">
                    {refund.reasonInternal}
                  </pre>
                </section>
              ) : null}
            </div>
          ) : null}
        </div>

        {detail && refund && detail.kind === "refund" ? (
          <div className="flex flex-wrap gap-2 border-t border-white/10 px-5 py-4">
            {capabilities.canApprove && ["pending", "reviewing"].includes(status) ? (
              <Button disabled={pending} onClick={() => onAction("approve")} type="button">
                Duyệt
              </Button>
            ) : null}
            {capabilities.canReject && !["completed", "rejected", "cancelled"].includes(status) ? (
              <Button disabled={pending} onClick={() => onAction("reject")} type="button" variant="danger">
                Từ chối
              </Button>
            ) : null}
            {capabilities.canComplete && status === "approved" ? (
              <Button disabled={pending} onClick={() => onAction("processing")} type="button" variant="secondary">
                Đang xử lý
              </Button>
            ) : null}
            {capabilities.canComplete && ["approved", "processing"].includes(status) ? (
              <Button disabled={pending} onClick={() => onAction("complete")} type="button">
                Hoàn tất
              </Button>
            ) : null}
            {capabilities.canComplete && status === "processing" ? (
              <Button disabled={pending} onClick={() => onAction("failed")} type="button" variant="danger">
                Thất bại
              </Button>
            ) : null}
            {detail.refund.qualityCaseId || detail.refund.coinRefundBatchId ? (
              <Link
                className="rounded-xl border border-white/10 px-3 py-2 text-sm text-cyan-300"
                href={`/admin/content-quality${detail.refund.coinRefundBatchId ? `?batch=${detail.refund.coinRefundBatchId}` : ""}`}
              >
                Case chất lượng
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
