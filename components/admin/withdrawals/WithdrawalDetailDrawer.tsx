"use client";

import Link from "next/link";
import { useEffect } from "react";
import Image from "next/image";
import { formatVnd } from "@/lib/admin/withdrawals/withdrawal-labels";
import type { AdminWithdrawalDetail, WithdrawalAdminAction } from "@/types/admin-withdrawal";
import { WithdrawalRiskBadge, WithdrawalStatusBadge } from "@/components/admin/withdrawals/WithdrawalBadges";
import { Button } from "@/components/ui";

type Props = {
  open: boolean;
  detail: AdminWithdrawalDetail | null;
  loading?: boolean;
  error?: string | null;
  pending?: boolean;
  onClose: () => void;
  onAction: (action: WithdrawalAdminAction) => void;
};

const ACTION_LABELS: Record<WithdrawalAdminAction, string> = {
  approve: "Duyệt",
  reject: "Từ chối",
  processing: "Đánh dấu đang xử lý",
  paid: "Đánh dấu đã thanh toán",
  failed: "Đánh dấu thất bại",
  risk_review: "Xem xét rủi ro",
  return_to_approved: "Trả về đã duyệt",
  reopen: "Mở lại"
};

export function WithdrawalDetailDrawer({
  open,
  detail,
  loading,
  error,
  pending,
  onClose,
  onAction
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
            <p className="text-xs uppercase tracking-wide text-cyan-300">Chi tiết rút tiền</p>
            <h2 className="mt-1 font-mono text-sm text-white">
              {detail?.withdrawalCode ?? "Đang tải…"}
            </h2>
            {detail ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <WithdrawalStatusBadge status={detail.status} />
                <WithdrawalRiskBadge level={detail.riskLevel} />
              </div>
            ) : null}
          </div>
          <Button onClick={onClose} type="button" variant="ghost">
            Đóng
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 text-sm">
          {loading && !detail ? (
            <p className="text-zinc-500">Đang tải chi tiết…</p>
          ) : null}
          {error ? <p className="text-rose-300">{error}</p> : null}

          {detail ? (
            <div className="space-y-6">
              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase text-zinc-500">Thông tin yêu cầu</h3>
                <dl className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <dt className="text-zinc-500">Số tiền yêu cầu</dt>
                    <dd className="font-semibold text-white">{formatVnd(detail.amountVnd)}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Phí / thực trả</dt>
                    <dd>
                      {formatVnd(detail.feeVnd)} /{" "}
                      <span className="text-emerald-200">{formatVnd(detail.netAmountVnd)}</span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Ngày tạo</dt>
                    <dd>{new Date(detail.requestedAt).toLocaleString("vi-VN")}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Cập nhật</dt>
                    <dd>{new Date(detail.updatedAt).toLocaleString("vi-VN")}</dd>
                  </div>
                  {detail.creatorNote ? (
                    <div className="sm:col-span-2">
                      <dt className="text-zinc-500">Ghi chú tác giả</dt>
                      <dd className="text-zinc-200">{detail.creatorNote}</dd>
                    </div>
                  ) : null}
                  {detail.paymentReference ? (
                    <div className="sm:col-span-2">
                      <dt className="text-zinc-500">Mã tham chiếu thanh toán</dt>
                      <dd className="font-mono text-cyan-200">{detail.paymentReference}</dd>
                    </div>
                  ) : null}
                  {detail.rejectReason ? (
                    <div className="sm:col-span-2">
                      <dt className="text-zinc-500">Lý do từ chối / thất bại</dt>
                      <dd className="text-rose-200">{detail.rejectReason}</dd>
                    </div>
                  ) : null}
                </dl>
              </section>

              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase text-zinc-500">Tác giả</h3>
                <div className="flex items-center gap-3">
                  {detail.creator.avatarUrl ? (
                    <Image
                      alt=""
                      className="h-12 w-12 rounded-full object-cover"
                      height={48}
                      src={detail.creator.avatarUrl}
                      width={48}
                    />
                  ) : null}
                  <div>
                    <p className="font-semibold text-white">
                      {detail.creator.displayName}
                      {detail.creator.hasBlueTick ? (
                        <span className="ml-1 text-cyan-300">✓</span>
                      ) : null}
                    </p>
                    <p className="text-xs text-zinc-500">
                      @{detail.creator.username ?? "—"} · {detail.creator.email ?? "—"}
                    </p>
                    <p className="text-xs text-zinc-400">Studio: {detail.creator.studioName ?? "—"}</p>
                  </div>
                </div>
                <dl className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <dt className="text-zinc-500">Monetization</dt>
                    <dd>{detail.creator.monetizationStatus ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Lần rút thành công</dt>
                    <dd>{detail.creator.successfulWithdrawalCount}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Tổng đã rút</dt>
                    <dd>{formatVnd(detail.creator.totalWithdrawnVnd)}</dd>
                  </div>
                </dl>
                <Link
                  className="text-xs text-cyan-300 hover:underline"
                  href={`/admin/creators?search=${encodeURIComponent(detail.creator.userId)}`}
                >
                  Xem hồ sơ tác giả →
                </Link>
              </section>

              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase text-zinc-500">Ví & ledger</h3>
                <dl className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <dt className="text-zinc-500">Available trước rút</dt>
                    <dd>
                      {detail.wallet.availableBeforeVnd != null
                        ? formatVnd(detail.wallet.availableBeforeVnd)
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Đang khóa</dt>
                    <dd>{formatVnd(detail.wallet.lockedVnd)}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Available hiện tại</dt>
                    <dd>{formatVnd(detail.wallet.availableVnd)}</dd>
                  </div>
                </dl>
                {detail.wallet.ledgerMismatch ? (
                  <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                    Cảnh báo: số dư locked không khớp ledger.
                  </p>
                ) : null}
                <Link className="text-xs text-cyan-300 hover:underline" href={detail.wallet.ledgerHref}>
                  Xem ledger / giao dịch liên quan →
                </Link>
              </section>

              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase text-zinc-500">Nhận tiền</h3>
                <p className="text-zinc-200">{detail.methodLabel}</p>
                <p className="font-mono text-zinc-300">{detail.payout.maskedAccount}</p>
              </section>

              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase text-zinc-500">Kiểm tra an toàn</h3>
                <ul className="space-y-1">
                  {detail.safetyChecks.map((check) => (
                    <li
                      className={`flex items-start gap-2 rounded-lg px-2 py-1.5 ${
                        check.passed ? "text-emerald-200" : "bg-rose-500/10 text-rose-200"
                      }`}
                      key={check.id}
                    >
                      <span>{check.passed ? "✓" : "✗"}</span>
                      <span>
                        {check.label}
                        {check.detail ? (
                          <span className="block text-xs text-zinc-500">{check.detail}</span>
                        ) : null}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase text-zinc-500">Lịch sử xử lý</h3>
                {detail.auditLog.length === 0 ? (
                  <p className="text-zinc-500">Chưa có bản ghi audit.</p>
                ) : (
                  <ul className="space-y-2">
                    {detail.auditLog.map((entry) => (
                      <li
                        className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2"
                        key={entry.id}
                      >
                        <p className="font-medium text-white">{entry.actionLabel}</p>
                        <p className="text-xs text-zinc-500">
                          {entry.actorLabel ?? "Hệ thống"} ·{" "}
                          {new Date(entry.createdAt).toLocaleString("vi-VN")}
                        </p>
                        {entry.note ? (
                          <p className="mt-1 text-xs text-zinc-400">{entry.note}</p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
                <Link
                  className="text-xs text-cyan-300 hover:underline"
                  href={`/admin/audit?target=payout_request:${detail.id}`}
                >
                  Xem toàn bộ audit →
                </Link>
              </section>
            </div>
          ) : null}
        </div>

        {detail && detail.allowedActions.length > 0 ? (
          <div className="border-t border-white/10 px-5 py-4">
            <div className="flex flex-wrap gap-2">
              {detail.allowedActions.map((action) => {
                const danger = action === "reject" || action === "failed";
                const canRun =
                  (danger && detail.canReject) || (!danger && detail.canApprove);
                if (!canRun) return null;
                return (
                  <Button
                    disabled={pending}
                    key={action}
                    onClick={() => onAction(action)}
                    type="button"
                    variant={danger ? "danger" : action === "paid" ? "primary" : "secondary"}
                  >
                    {ACTION_LABELS[action]}
                  </Button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
