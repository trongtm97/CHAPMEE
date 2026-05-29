import Link from "next/link";
import { StudioFinancePage } from "@/components/studio/StudioFinancePage";
import { ErrorState, SectionHeader } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getStudioAccess } from "@/lib/creator/getStudioAccess";
import { getCreatorFinanceSummary } from "@/lib/finance/get-creator-finance-summary";
import type { EarningsPeriodFilter } from "@/types/finance";

export const dynamic = "force-dynamic";

const PERIODS = new Set<EarningsPeriodFilter>(["7d", "30d", "90d", "all"]);

export default async function StudioFinanceRoute({
  searchParams
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { creatorProfile, error } = await getStudioAccess("/studio/finance");
  const { profile } = await getCurrentUser();
  const params = await searchParams;
  const periodParam = params.period ?? "30d";
  const earningsFilter: EarningsPeriodFilter = PERIODS.has(periodParam as EarningsPeriodFilter)
    ? (periodParam as EarningsPeriodFilter)
    : "30d";

  if (error || !creatorProfile || !profile?.id) {
    return (
      <section className="space-y-6">
        <SectionHeader title="Tài chính" />
        <ErrorState message={error} title="Không tải được quyền truy cập Studio" />
      </section>
    );
  }

  const data = await getCreatorFinanceSummary({
    creatorUserId: profile.id,
    earningsFilter
  });

  return (
    <section className="space-y-6">
      <Link
        className="text-sm font-semibold text-sky-300 hover:text-sky-200"
        href="/studio"
      >
        Trở về tổng quan
      </Link>

      <SectionHeader
        subtitle="Theo dõi doanh thu, lịch sử giao dịch và yêu cầu rút tiền của bạn."
        title="Tài chính"
      />

      <StudioFinancePage creatorUserId={profile.id} data={data} />
    </section>
  );
}
