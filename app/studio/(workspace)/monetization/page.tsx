import Link from "next/link";
import { StudioMonetizationPage } from "@/components/studio/StudioMonetizationPage";
import { ErrorState, SectionHeader } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getStudioAccess } from "@/lib/creator/getStudioAccess";
import { getStudioMonetizationSummary } from "@/lib/studio/get-monetization-summary";

export const dynamic = "force-dynamic";

export default async function StudioMonetizationRoute() {
  const { creatorProfile, error } = await getStudioAccess("/studio/monetization");
  const { profile } = await getCurrentUser();

  if (error || !creatorProfile || !profile?.id) {
    return (
      <section className="space-y-6">
        <SectionHeader title="Kiếm tiền" />
        <ErrorState message={error} title="Không tải được quyền truy cập Studio" />
      </section>
    );
  }

  const data = await getStudioMonetizationSummary(creatorProfile, profile.id);

  return (
    <section className="space-y-6">
      <Link
        className="text-sm font-semibold text-sky-300 hover:text-sky-200"
        href="/studio"
      >
        Trở về tổng quan
      </Link>

      <SectionHeader
        subtitle="Quản lý doanh thu, thiết lập trả phí và yêu cầu rút tiền của bạn."
        title="Kiếm tiền"
      />

      <StudioMonetizationPage data={data} />
    </section>
  );
}
