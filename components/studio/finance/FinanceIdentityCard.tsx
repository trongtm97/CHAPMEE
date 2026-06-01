import Link from "next/link";
import { FinanceBadge, FinanceSection } from "@/components/studio/finance/finance-ui";
import type { FinanceIdentityStatus } from "@/types/finance";

const STATUS_TONE = {
  unverified: "amber",
  pending: "purple",
  verified: "green",
  rejected: "rose"
} as const;

const STATUS_LABEL = {
  unverified: "Chưa xác thực",
  pending: "Đang chờ duyệt",
  verified: "Đã xác thực",
  rejected: "Bị từ chối"
} as const;

type FinanceIdentityCardProps = {
  identity: FinanceIdentityStatus;
};

export function FinanceIdentityCard({ identity }: FinanceIdentityCardProps) {
  const tone = STATUS_TONE[identity.status];

  return (
    <FinanceSection title="Xác thực tài khoản">
      <div className="flex flex-wrap items-center gap-2">
        <FinanceBadge tone={tone}>{STATUS_LABEL[identity.status]}</FinanceBadge>
        {identity.verifiedName ? (
          <span className="text-xs text-zinc-500">Tên xác thực: {identity.verifiedName}</span>
        ) : null}
      </div>
      <p className="mt-2 text-sm text-zinc-500">{identity.description}</p>
      {identity.status !== "verified" ? (
        <Link
          className="mt-3 inline-flex h-9 items-center rounded-lg border border-cyan-400/45 bg-cyan-500/20 px-3 text-sm font-semibold text-cyan-50 hover:bg-cyan-500/30"
          href={identity.ctaHref}
        >
          {identity.ctaLabel}
        </Link>
      ) : (
        <p className="mt-3 text-sm font-medium text-emerald-200">Đã xác thực</p>
      )}
    </FinanceSection>
  );
}
