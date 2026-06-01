import Link from "next/link";
import {
  FinanceAlert,
  FinanceBadge,
  FinanceSection
} from "@/components/studio/finance/finance-ui";
import type { FinanceIdentityStatus, StudioFinanceEligibility } from "@/types/finance";

const IDENTITY_TONE = {
  unverified: "amber",
  pending: "purple",
  verified: "green",
  rejected: "rose"
} as const;

const IDENTITY_LABEL = {
  unverified: "Chưa xác thực",
  pending: "Đang chờ duyệt",
  verified: "Đã xác thực",
  rejected: "Bị từ chối"
} as const;

type FinanceWithdrawalStatusCardProps = {
  eligibility: StudioFinanceEligibility;
  identity: FinanceIdentityStatus;
};

export function FinanceWithdrawalStatusCard({
  eligibility,
  identity
}: FinanceWithdrawalStatusCardProps) {
  let withdrawalBadge: { tone: "green" | "rose" | "amber"; label: string };
  if (eligibility.withdrawalDisabledByAdmin) {
    withdrawalBadge = { tone: "rose", label: "Khóa admin" };
  } else if (eligibility.canWithdraw) {
    withdrawalBadge = { tone: "green", label: "Đang mở" };
  } else {
    withdrawalBadge = { tone: "amber", label: "Chưa đủ điều kiện" };
  }

  return (
    <FinanceSection
      description="Kiểm tra nhanh trước khi gửi yêu cầu rút tiền."
      title="Trạng thái rút tiền"
    >
      <div className="flex flex-wrap gap-2">
        <FinanceBadge tone={withdrawalBadge.tone}>{withdrawalBadge.label}</FinanceBadge>
        <FinanceBadge tone={IDENTITY_TONE[identity.status]}>
          Xác thực: {IDENTITY_LABEL[identity.status]}
        </FinanceBadge>
        <FinanceBadge
          tone={
            eligibility.pinStatus === "set"
              ? "green"
              : eligibility.pinStatus === "locked_temp"
                ? "rose"
                : "slate"
          }
        >
          PIN:{" "}
          {eligibility.pinStatus === "set"
            ? "Đã thiết lập"
            : eligibility.pinStatus === "locked_temp"
              ? "Đang khóa"
              : "Chưa thiết lập"}
        </FinanceBadge>
        <FinanceBadge tone={eligibility.hasWithdrawableBankAccount ? "green" : "amber"}>
          Tài khoản nhận tiền: {eligibility.hasWithdrawableBankAccount ? "Sẵn sàng" : "Chưa sẵn sàng"}
        </FinanceBadge>
      </div>

      <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
        <p className="text-sm font-semibold text-zinc-200">Xác thực tài khoản</p>
        <p className="mt-1 text-xs text-zinc-500">{identity.description}</p>
        {identity.status !== "verified" ? (
          <Link
            className="mt-2 inline-flex text-sm font-semibold text-cyan-300 hover:text-cyan-200"
            href={identity.ctaHref}
          >
            {identity.ctaLabel}
          </Link>
        ) : (
          <p className="mt-2 text-sm font-medium text-emerald-200">Đã xác thực</p>
        )}
      </div>

      {eligibility.canWithdraw ? (
        <FinanceAlert tone="green">Bạn có thể gửi yêu cầu rút tiền.</FinanceAlert>
      ) : eligibility.primaryBlockReason ? (
        <FinanceAlert tone="amber">{eligibility.primaryBlockReason}</FinanceAlert>
      ) : null}
    </FinanceSection>
  );
}
