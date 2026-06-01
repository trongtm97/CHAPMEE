"use client";

import Link from "next/link";
import type { CreatorAdSharingStatusForStudio } from "@/types/creator-ad-revenue-policy";
import { CREATOR_AD_PAYOUT_CYCLE_LABELS, CREATOR_AD_STATUS_LABELS } from "@/types/creator-ad-revenue-policy";

function formatVnd(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0
  }).format(Math.round(value));
}

const TONE_CLASSES: Record<CreatorAdSharingStatusForStudio["statusTone"], string> = {
  neutral: "border-white/10 bg-white/[0.02] text-zinc-300",
  success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-100",
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-100",
  danger: "border-red-500/30 bg-red-500/10 text-red-200"
};

type StudioAdRevenueSharingSectionProps = {
  status: CreatorAdSharingStatusForStudio;
};

export function StudioAdRevenueSharingSection({ status }: StudioAdRevenueSharingSectionProps) {
  const participationLabel =
    CREATOR_AD_STATUS_LABELS[status.participationStatus] ?? status.participationStatus;
  const payoutLabel =
    CREATOR_AD_PAYOUT_CYCLE_LABELS[status.policy.payout_cycle] ?? status.policy.payout_cycle;

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white">Chia sẻ doanh thu quảng cáo</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Tách biệt với Coin và chương trả phí. Số liệu thanh toán thật sẽ được đối soát sau khi
          ChapMee nhận tiền từ đối tác quảng cáo.
        </p>
      </div>

      {status.betaMode ? (
        <p className="rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-sm text-violet-100">
          Chương trình đang trong giai đoạn <strong>thử nghiệm (beta)</strong>. Tỷ lệ và điều kiện
          có thể thay đổi.
        </p>
      ) : null}

      {!status.programEnabled ? (
        <p className="text-sm text-zinc-500">
          ChapMee chưa mở chương trình chia sẻ doanh thu quảng cáo trên toàn nền tảng.
        </p>
      ) : (
        <>
          <div className={`rounded-xl border px-3 py-2 text-sm ${TONE_CLASSES[status.statusTone]}`}>
            <p className="font-medium">Trạng thái: {participationLabel}</p>
            {status.statusMessage ? <p className="mt-1 opacity-90">{status.statusMessage}</p> : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 text-sm text-zinc-400">
            <div>
              <span className="text-zinc-500">Quỹ tác giả</span>
              <p className="text-white">{status.policy.creator_pool_percent}% doanh thu QC hợp lệ</p>
            </div>
            <div>
              <span className="text-zinc-500">Dự phòng</span>
              <p className="text-white">
                {status.policy.reserve_percent}% · giữ {status.policy.reserve_hold_days} ngày
              </p>
            </div>
            <div>
              <span className="text-zinc-500">Rút tối thiểu</span>
              <p className="text-white">{formatVnd(status.policy.min_payout_vnd)}</p>
            </div>
            <div>
              <span className="text-zinc-500">Chu kỳ</span>
              <p className="text-white">{payoutLabel}</p>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-zinc-200">Điều kiện tham gia</h3>
            <ul className="mt-2 space-y-2">
              {status.checklist.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/5 px-3 py-2 text-sm"
                >
                  <span className={item.met ? "text-emerald-300" : "text-zinc-400"}>
                    {item.met ? "✓" : "○"} {item.label}
                  </span>
                  {!item.met && item.ctaHref && item.ctaLabel ? (
                    <Link className="text-cyan-300 text-xs font-semibold" href={item.ctaHref}>
                      {item.ctaLabel}
                    </Link>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      {status.policyText ? (
        <details className="rounded-xl border border-white/10">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-zinc-200">
            Chính sách hiện hành
          </summary>
          <div className="border-t border-white/10 px-4 py-3 text-sm text-zinc-400 whitespace-pre-wrap max-h-96 overflow-y-auto">
            {status.policyText}
          </div>
        </details>
      ) : null}
    </section>
  );
}
