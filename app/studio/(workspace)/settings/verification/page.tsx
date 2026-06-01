import Link from "next/link";
import { StudioVerificationCenter } from "@/components/studio/verification/StudioVerificationCenter";
import { ErrorState } from "@/components/ui";
import { getStudioAccess } from "@/lib/creator/getStudioAccess";
import { studioPath } from "@/lib/studio/constants";
import { getUserVerificationSummary } from "@/lib/verification/get-user-verification";

export const dynamic = "force-dynamic";

export default async function StudioVerificationSettingsPage() {
  const { creatorProfile, error } = await getStudioAccess(studioPath("/settings/verification"));

  if (error || !creatorProfile) {
    return (
      <section className="w-full min-w-0 space-y-6">
        <ErrorState message={error} title="Không tải được quyền truy cập Studio" />
      </section>
    );
  }

  const summary = await getUserVerificationSummary(creatorProfile.user_id);

  return (
    <section className="w-full min-w-0 space-y-6 pb-24 lg:pb-8">
      <div className="space-y-2">
        <Link
          className="text-sm font-semibold text-cyan-300 hover:text-cyan-200"
          href={studioPath("/settings")}
        >
          ← Cài đặt Studio
        </Link>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Xác thực tài khoản</h1>
        <p className="max-w-2xl text-sm text-zinc-400 sm:text-base">
          Xác thực giúp tăng độ tin cậy hồ sơ và mở tick xanh — không bắt buộc để kiếm tiền hay
          rút tiền trên ChapMee.
        </p>
      </div>

      <StudioVerificationCenter displayName={creatorProfile.display_name} summary={summary} />
    </section>
  );
}
