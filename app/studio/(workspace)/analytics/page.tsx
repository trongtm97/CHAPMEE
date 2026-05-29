import Link from "next/link";
import { StudioAnalyticsPage } from "@/components/studio/analytics/StudioAnalyticsPage";
import { ErrorState, SectionHeader } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getStudioAccess } from "@/lib/creator/getStudioAccess";
import {
  getStudioAnalytics,
  getStudioAnalyticsRange
} from "@/lib/studio/get-studio-analytics";

type StudioAnalyticsRouteProps = {
  searchParams: Promise<{
    range?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function StudioAnalyticsRoute({
  searchParams
}: StudioAnalyticsRouteProps) {
  const params = await searchParams;
  const activeRange = getStudioAnalyticsRange(params.range);
  const { creatorProfile, error } = await getStudioAccess("/studio/analytics");
  const { profile } = await getCurrentUser();

  if (error || !creatorProfile || !profile?.id) {
    return (
      <section className="space-y-6">
        <SectionHeader title="Thống kê" />
        <ErrorState message={error} title="Không tải được quyền truy cập Studio" />
      </section>
    );
  }

  const data = await getStudioAnalytics(creatorProfile, profile.id, activeRange);

  return (
    <section className="space-y-6">
      <Link
        className="text-sm font-semibold text-sky-300 hover:text-sky-200"
        href="/studio"
      >
        Trở về tổng quan
      </Link>

      <SectionHeader
        subtitle="Theo dõi hiệu quả truyện, chương và nội dung Swipe của bạn."
        title="Thống kê"
      />

      <StudioAnalyticsPage data={data} />
    </section>
  );
}
