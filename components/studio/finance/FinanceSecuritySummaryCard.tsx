import {
  FinanceBadge,
  FinanceSection,
  payoutVerificationBadge
} from "@/components/studio/finance/finance-ui";
import { formatLockRemaining } from "@/lib/finance/finance-security-utils";
import type {
  CreatorPayoutProfileView,
  FinanceSecurityLogRow,
  WithdrawalHistoryRow
} from "@/types/finance";

type FinanceSecuritySummaryCardProps = {
  userEmail: string | null;
  pinConfigured: boolean;
  pinLocked: boolean;
  payoutProfile: CreatorPayoutProfileView | null;
  securityLogs: FinanceSecurityLogRow[];
  withdrawalHistory: WithdrawalHistoryRow[];
};

export function FinanceSecuritySummaryCard({
  userEmail,
  pinConfigured,
  pinLocked,
  payoutProfile,
  securityLogs,
  withdrawalHistory
}: FinanceSecuritySummaryCardProps) {
  const verification = payoutVerificationBadge(payoutProfile?.verificationStatus ?? "none");
  const lastBankChange = payoutProfile?.lastBankChangeAt
    ? new Date(payoutProfile.lastBankChangeAt).toLocaleString("vi-VN")
    : "—";
  const lastWithdrawal = withdrawalHistory[0]
    ? new Date(withdrawalHistory[0].requestedAt).toLocaleString("vi-VN")
    : "—";
  const lockRemaining = formatLockRemaining(payoutProfile?.withdrawalLockedUntil);

  return (
    <FinanceSection
      description="Tóm tắt bảo mật tài chính của bạn."
      id="finance-security"
      title="Bảo mật tài chính"
    >
      <dl className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
          <dt className="text-xs text-zinc-500">Email xác thực</dt>
          <dd className="mt-1 text-sm text-zinc-200">{userEmail ?? "Chưa có"}</dd>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
          <dt className="text-xs text-zinc-500">Trạng thái PIN</dt>
          <dd className="mt-1">
            <FinanceBadge tone={pinLocked ? "rose" : pinConfigured ? "green" : "slate"}>
              {pinLocked ? "Đang khóa" : pinConfigured ? "Đã thiết lập" : "Chưa thiết lập"}
            </FinanceBadge>
          </dd>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
          <dt className="text-xs text-zinc-500">Xác thực nhận tiền</dt>
          <dd className="mt-1">
            <FinanceBadge tone={verification.tone}>{verification.label}</FinanceBadge>
          </dd>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
          <dt className="text-xs text-zinc-500">Đổi ngân hàng gần nhất</dt>
          <dd className="mt-1 text-sm text-zinc-300">{lastBankChange}</dd>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
          <dt className="text-xs text-zinc-500">Rút tiền gần nhất</dt>
          <dd className="mt-1 text-sm text-zinc-300">{lastWithdrawal}</dd>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
          <dt className="text-xs text-zinc-500">Khóa rút tiền</dt>
          <dd className="mt-1 text-sm text-zinc-300">
            {lockRemaining ? `Còn ${lockRemaining}` : "Không"}
          </dd>
        </div>
      </dl>
      <p className="mt-3 text-xs text-zinc-500">
        {securityLogs.length} sự kiện bảo mật gần đây — xem chi tiết trong tab Lịch sử → Bảo mật tài
        chính.
      </p>
    </FinanceSection>
  );
}
