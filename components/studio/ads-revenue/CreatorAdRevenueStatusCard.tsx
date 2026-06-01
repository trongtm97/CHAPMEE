import Link from "next/link";
import type { CreatorAdRevenueDashboard } from "@/types/creator-ad-revenue-dashboard";
import {
  CREATOR_AD_STATUS_LABELS
} from "@/types/creator-ad-revenue-policy";
import type {
  CreatorAdKycStatus,
  CreatorAdPayoutStatus,
  CreatorAdTaxStatus
} from "@/types/creator-ad-revenue-policy";

const TONE_CLASSES = {
  neutral: "border-white/10 bg-white/[0.02] text-zinc-300",
  success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-100",
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-100",
  danger: "border-red-500/30 bg-red-500/10 text-red-200"
} as const;

const KYC_LABELS: Record<CreatorAdKycStatus, string> = {
  not_started: "Chưa bắt đầu",
  pending: "Đang chờ duyệt",
  verified: "Đã xác thực",
  rejected: "Cần cập nhật"
};

const TAX_LABELS: Record<CreatorAdTaxStatus, string> = {
  not_submitted: "Chưa nộp",
  submitted: "Đã gửi",
  verified: "Đã xác nhận",
  rejected: "Cần cập nhật"
};

const PAYOUT_LABELS: Record<CreatorAdPayoutStatus, string> = {
  not_setup: "Chưa thiết lập",
  pending: "Đang xử lý",
  verified: "Sẵn sàng",
  blocked: "Cần xử lý"
};

type CreatorAdRevenueStatusCardProps = {
  dashboard: CreatorAdRevenueDashboard;
};

export function CreatorAdRevenueStatusCard({ dashboard }: CreatorAdRevenueStatusCardProps) {
  const { sharing, compliance } = dashboard;
  const participationLabel =
    CREATOR_AD_STATUS_LABELS[sharing.participationStatus] ?? sharing.participationStatus;

  const showChecklist =
    sharing.programEnabled &&
    !sharing.allRequirementsMet &&
    sharing.participationStatus !== "eligible";

  if (!sharing.programEnabled) {
    return (
      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-3">
        <h2 className="text-lg font-semibold text-white">Trạng thái tham gia</h2>
        <p className="text-sm text-zinc-500">
          Chương trình chia sẻ doanh thu quảng cáo chưa mở cho tài khoản này.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white">Trạng thái tham gia</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Chỉ thanh toán khi đủ điều kiện. Số liệu có thể thay đổi sau đối soát.
        </p>
      </div>

      {sharing.betaMode ? (
        <p className="rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-sm text-violet-100">
          Chương trình đang trong giai đoạn thử nghiệm (beta).
        </p>
      ) : null}

      <div className={`rounded-xl border px-3 py-2 text-sm ${TONE_CLASSES[sharing.statusTone]}`}>
        <p className="font-medium">Tham gia: {participationLabel}</p>
        {sharing.statusMessage ? <p className="mt-1 opacity-90">{sharing.statusMessage}</p> : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-3 text-sm">
        <StatusPill label="Xác thực (KYC)" value={KYC_LABELS[compliance.kyc_status]} />
        <StatusPill label="Thông tin thuế" value={TAX_LABELS[compliance.tax_status]} />
        <StatusPill label="Nhận thanh toán" value={PAYOUT_LABELS[compliance.payout_status]} />
      </div>

      {showChecklist ? (
        <div>
          <h3 className="text-sm font-semibold text-zinc-200">Điều kiện còn thiếu</h3>
          <ul className="mt-2 space-y-2">
            {sharing.checklist.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/5 px-3 py-2 text-sm"
              >
                <span className={item.met ? "text-emerald-300" : "text-zinc-400"}>
                  {item.met ? "✓" : "○"} {item.label}
                </span>
                {!item.met && item.ctaHref && item.ctaLabel ? (
                  <Link className="text-xs font-semibold text-cyan-300" href={item.ctaHref}>
                    {item.ctaLabel}
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function StatusPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-0.5 font-medium text-zinc-200">{value}</p>
    </div>
  );
}
