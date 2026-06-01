import Link from "next/link";
import { StudioMonetizationPage } from "@/components/studio/StudioMonetizationPage";
import { ErrorState } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getStudioAccess } from "@/lib/creator/getStudioAccess";
import { getCreatorAdRevenueDashboard } from "@/lib/studio/get-creator-ad-revenue-dashboard";
import { getStudioMonetizationSummary } from "@/lib/studio/get-monetization-summary";
import { STUDIO_PAGE_WIDTH_CLASS } from "@/lib/studio/constants";

export const dynamic = "force-dynamic";

export default async function StudioMonetizationRoute() {
  const { creatorProfile, error } = await getStudioAccess("/studio/monetization");
  const { profile } = await getCurrentUser();

  if (error || !creatorProfile || !profile?.id) {
    return (
      <section className={`${STUDIO_PAGE_WIDTH_CLASS} space-y-6`}>
        <h1 className="text-2xl font-bold text-white">Kiếm tiền</h1>
        <ErrorState message={error} title="Không tải được quyền truy cập Studio" />
        <p className="text-sm text-zinc-500">
          <Link className="text-cyan-300 hover:underline" href="/studio/setup">
            Đăng ký tác giả
          </Link>{" "}
          để bật kiếm tiền và xem doanh thu.
        </p>
      </section>
    );
  }

  const [data, adDashboard] = await Promise.all([
    getStudioMonetizationSummary(creatorProfile, profile.id),
    getCreatorAdRevenueDashboard(profile.id)
  ]);

  return (
    <section className={STUDIO_PAGE_WIDTH_CLASS}>
      <Link
        className="mb-6 inline-flex text-sm font-semibold text-cyan-300 hover:text-cyan-200"
        href="/studio"
      >
        ← Trở về tổng quan
      </Link>

      <StudioMonetizationPage adDashboard={adDashboard} data={data} />
    </section>
  );
}
