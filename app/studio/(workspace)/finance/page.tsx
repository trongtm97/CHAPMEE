import { Suspense } from "react";
import { StudioAdRevenueDashboard } from "@/components/studio/ads-revenue/StudioAdRevenueDashboard";
import { StudioFinanceTabs } from "@/components/studio/finance/StudioFinanceTabs";
import { StudioFinancePage } from "@/components/studio/StudioFinancePage";
import { ErrorState } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getStudioAccess } from "@/lib/creator/getStudioAccess";
import { getCreatorFinanceSummary } from "@/lib/finance/get-creator-finance-summary";
import { getCreatorAdRevenueDashboard } from "@/lib/studio/get-creator-ad-revenue-dashboard";
import { STUDIO_PAGE_WIDTH_CLASS } from "@/lib/studio/constants";
import type { EarningsPeriodFilter } from "@/types/finance";

export const dynamic = "force-dynamic";

const PERIODS = new Set<EarningsPeriodFilter>(["7d", "30d", "90d", "all"]);

export default async function StudioFinanceRoute({
  searchParams
}: {
  searchParams: Promise<{ period?: string; tab?: string }>;
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
      <section className={`${STUDIO_PAGE_WIDTH_CLASS} space-y-6`}>
        <h1 className="text-2xl font-bold text-white">Tài chính</h1>
        <ErrorState message={error} title="Không tải được quyền truy cập Studio" />
        <p className="text-sm text-zinc-500">
          Bạn cần hoàn tất đăng ký tác giả để xem tài chính và doanh thu quảng cáo.{" "}
          <a className="text-cyan-300 hover:underline" href="/studio/setup">
            Thiết lập Studio
          </a>
        </p>
      </section>
    );
  }

  const [data, adDashboard] = await Promise.all([
    getCreatorFinanceSummary({
      creatorUserId: profile.id,
      earningsFilter
    }),
    getCreatorAdRevenueDashboard(profile.id)
  ]);

  return (
    <section className={STUDIO_PAGE_WIDTH_CLASS}>
      <Suspense fallback={<div className="text-zinc-500">Đang tải…</div>}>
        <StudioFinanceTabs
          overview={<StudioFinancePage creatorUserId={profile.id} data={data} />}
          adRevenue={<StudioAdRevenueDashboard dashboard={adDashboard} variant="finance" />}
        />
      </Suspense>
    </section>
  );
}
