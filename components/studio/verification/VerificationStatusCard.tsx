"use client";

import { VERIFICATION_STATUS_LABELS, VERIFICATION_TYPE_LABELS } from "@/lib/verification/labels";
import type { AccountVerificationRow, UserVerificationSummary } from "@/types/verification";

type VerificationStatusCardProps = {
  summary: UserVerificationSummary;
  onStart: () => void;
  onSupplement: () => void;
  onResubmit: () => void;
};

function resolveActiveRequest(summary: UserVerificationSummary): AccountVerificationRow | null {
  return summary.latestPending ?? summary.latestNeedsMoreInfo ?? null;
}

function resolveDisplayStatus(summary: UserVerificationSummary): string {
  if (summary.publicBadge) {
    return "Đã xác thực";
  }
  const active = resolveActiveRequest(summary);
  if (active) {
    return VERIFICATION_STATUS_LABELS[active.status] ?? active.status;
  }
  if (summary.latestRejected) {
    return "Bị từ chối";
  }
  if (summary.latestRevoked) {
    return "Đã thu hồi";
  }
  return "Chưa xác thực";
}

export function VerificationStatusCard({
  onResubmit,
  onStart,
  onSupplement,
  summary
}: VerificationStatusCardProps) {
  const active = resolveActiveRequest(summary);
  const statusLabel = resolveDisplayStatus(summary);
  const latest = active ?? summary.latestApproved ?? summary.latestRejected ?? summary.latestRevoked;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold text-white">Trạng thái hiện tại</p>
        <span
          className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
            statusLabel === "Đã xác thực"
              ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200"
              : statusLabel === "Đang xét duyệt"
                ? "border-amber-400/40 bg-amber-400/10 text-amber-200"
                : statusLabel === "Cần bổ sung"
                  ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-200"
                  : "border-zinc-500/40 bg-zinc-500/10 text-zinc-300"
          }`}
        >
          {statusLabel}
        </span>
      </div>

      {latest ? (
        <dl className="mt-4 space-y-2 text-sm text-zinc-400">
          <div className="flex justify-between gap-3">
            <dt>Loại xác thực</dt>
            <dd className="text-right text-zinc-200">
              {VERIFICATION_TYPE_LABELS[latest.verification_type]}
            </dd>
          </div>
          {latest.submitted_at ? (
            <div className="flex justify-between gap-3">
              <dt>Ngày gửi</dt>
              <dd className="text-right text-zinc-200">
                {new Date(latest.submitted_at).toLocaleString("vi-VN")}
              </dd>
            </div>
          ) : null}
          {latest.reviewed_at ? (
            <div className="flex justify-between gap-3">
              <dt>Ngày xử lý</dt>
              <dd className="text-right text-zinc-200">
                {new Date(latest.reviewed_at).toLocaleString("vi-VN")}
              </dd>
            </div>
          ) : null}
        </dl>
      ) : (
        <p className="mt-3 text-sm text-zinc-400">Bạn chưa gửi yêu cầu xác thực nào.</p>
      )}

      {summary.latestNeedsMoreInfo?.public_note ? (
        <p className="mt-3 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-sm text-cyan-100">
          Yêu cầu bổ sung: {summary.latestNeedsMoreInfo.public_note}
        </p>
      ) : null}

      {summary.latestRejected?.rejection_reason || summary.latestRejected?.public_note ? (
        <p className="mt-3 rounded-xl border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-100">
          Lý do từ chối:{" "}
          {summary.latestRejected.rejection_reason ?? summary.latestRejected.public_note}
        </p>
      ) : null}

      {summary.latestRevoked?.revoke_reason ? (
        <p className="mt-3 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">
          Lý do thu hồi: {summary.latestRevoked.revoke_reason}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {!summary.publicBadge && !summary.latestPending && !summary.latestNeedsMoreInfo ? (
          <button
            className="inline-flex min-h-10 items-center rounded-full bg-cyan-300 px-4 text-sm font-semibold text-zinc-950"
            onClick={onStart}
            type="button"
          >
            Gửi yêu cầu xác thực
          </button>
        ) : null}
        {summary.latestNeedsMoreInfo ? (
          <button
            className="inline-flex min-h-10 items-center rounded-full bg-cyan-300 px-4 text-sm font-semibold text-zinc-950"
            onClick={onSupplement}
            type="button"
          >
            Bổ sung hồ sơ
          </button>
        ) : null}
        {summary.latestPending ? (
          <span className="inline-flex min-h-10 items-center rounded-full border border-amber-400/40 px-4 text-sm font-semibold text-amber-200">
            Đang chờ duyệt
          </span>
        ) : null}
        {summary.latestRejected && !summary.latestPending ? (
          <button
            className="inline-flex min-h-10 items-center rounded-full border border-white/10 px-4 text-sm font-semibold text-zinc-100"
            onClick={onResubmit}
            type="button"
          >
            Gửi lại yêu cầu
          </button>
        ) : null}
        {summary.publicBadge ? (
          <span className="inline-flex min-h-10 items-center rounded-full border border-emerald-400/40 px-4 text-sm font-semibold text-emerald-200">
            Xem thông tin xác thực
          </span>
        ) : null}
        {summary.latestRevoked && !summary.publicBadge && !summary.latestPending ? (
          <button
            className="inline-flex min-h-10 items-center rounded-full border border-white/10 px-4 text-sm font-semibold text-zinc-100"
            onClick={onResubmit}
            type="button"
          >
            Gửi yêu cầu mới
          </button>
        ) : null}
      </div>

      {summary.latestPending ? (
        <ol className="mt-4 space-y-2 text-sm text-zinc-400">
          <li className="text-emerald-300">1. Đã gửi yêu cầu</li>
          <li className="text-amber-200">2. Đang chờ admin xét duyệt</li>
          <li>3. Kết quả</li>
        </ol>
      ) : null}
    </div>
  );
}
