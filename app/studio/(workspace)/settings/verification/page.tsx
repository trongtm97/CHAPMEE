import Link from "next/link";
import { StudioVerificationStatus } from "@/components/studio/StudioVerificationStatus";
import { ErrorState, SectionHeader } from "@/components/ui";
import { getStudioAccess } from "@/lib/creator/getStudioAccess";
import { getUserVerificationSummary } from "@/lib/verification/get-user-verification";

export const dynamic = "force-dynamic";

export default async function StudioVerificationSettingsPage() {
  const { creatorProfile, error } = await getStudioAccess(
    "/studio/settings/verification"
  );

  if (error || !creatorProfile) {
    return (
      <section className="space-y-6">
        <ErrorState message={error} title="Không tải được quyền truy cập Studio" />
      </section>
    );
  }

  const summary = await getUserVerificationSummary(creatorProfile.user_id);

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <Link
          className="text-sm font-semibold text-sky-300 hover:text-sky-200"
          href="/studio/settings"
        >
          ← Cài đặt Studio
        </Link>
        <SectionHeader
          subtitle="Tick xanh và trạng thái xác thực tài khoản tác giả trên ChapMee."
          title="Xác thực tài khoản"
        />
      </div>
      <StudioVerificationStatus summary={summary} />
    </section>
  );
}
