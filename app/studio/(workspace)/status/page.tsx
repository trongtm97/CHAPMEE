import { redirect } from "next/navigation";
import { CreatorStatusView } from "@/components/moderation/CreatorStatusView";
import { getStudioAccess } from "@/lib/creator/getStudioAccess";
import { getCreatorStatusSafe } from "@/lib/moderation/get-creator-status";
import { STUDIO_FULL_NAME } from "@/lib/studio/constants";

export const dynamic = "force-dynamic";

export default async function StudioStatusPage() {
  const { creatorProfile, user } = await getStudioAccess("/studio/status");

  if (!user) {
    redirect("/login?next=/studio/status");
  }

  if (!creatorProfile) {
    redirect("/studio");
  }

  const status = await getCreatorStatusSafe(user.id, creatorProfile.id);

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-sky-300">
          {STUDIO_FULL_NAME}
        </p>
        <h1 className="mt-3 text-2xl font-black text-white">Trạng thái tài khoản</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Kiểm duyệt, hạn chế đăng và vi phạm liên quan tới hồ sơ tác giả của bạn.
        </p>
      </div>
      <CreatorStatusView status={status} />
    </section>
  );
}
