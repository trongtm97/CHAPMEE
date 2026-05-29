import Link from "next/link";
import { Card, ErrorState, SectionHeader } from "@/components/ui";
import { CreatorProfileSettingsForm } from "@/components/studio/settings/CreatorProfileSettingsForm";
import { getStudioAccess } from "@/lib/creator/getStudioAccess";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function StudioSettingsPage() {
  const { creatorProfile, error } = await getStudioAccess("/studio/settings");

  if (error || !creatorProfile) {
    return (
      <section className="space-y-6">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-sky-300">
            Cài đặt Studio
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-normal text-white">
            Cài đặt
          </h2>
        </div>
        <ErrorState message={error} title="Không tải được quyền truy cập Studio" />
      </section>
    );
  }

  const supabase = await createClient();
  const { data: publicProfile } = await supabase
    .from("profiles")
    .select("avatar_url")
    .eq("id", creatorProfile.user_id)
    .maybeSingle();

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <Link
          className="text-sm font-semibold text-sky-300 hover:text-sky-200"
          href="/studio"
        >
          Trở về tổng quan
        </Link>
        <SectionHeader
          subtitle="Chỉnh thông tin công khai của hồ sơ tác giả."
          title="Hồ sơ tác giả"
        />
      </div>

      <CreatorProfileSettingsForm
        avatarUrl={publicProfile?.avatar_url ?? null}
        bio={creatorProfile.bio}
        creatorId={creatorProfile.id}
        creatorPenName={creatorProfile.pen_name}
      />

      <Card className="space-y-3">
        <p className="text-sm font-semibold text-white">Xác thực tài khoản</p>
        <p className="text-sm leading-6 text-zinc-400">
          Xem trạng thái tick xanh và gửi yêu cầu xác thực (nếu được bật).
        </p>
        <Link
          className="inline-flex text-sm font-semibold text-sky-300 hover:text-sky-200"
          href="/studio/settings/verification"
        >
          Mở trang xác thực →
        </Link>
      </Card>

      <Card className="space-y-3">
        <p className="text-sm font-semibold text-white">Trung tâm hỗ trợ</p>
        <p className="text-sm leading-6 text-zinc-400">
          Hướng dẫn đăng truyện, quy định, FAQ và kênh liên hệ ChapMee.
        </p>
        <Link
          className="inline-flex text-sm font-semibold text-sky-300 hover:text-sky-200"
          href="/studio/help"
        >
          Mở Trung tâm hỗ trợ →
        </Link>
      </Card>

      <Card className="space-y-3">
        <p className="text-sm font-semibold text-white">Notes</p>
        <p className="text-sm leading-6 text-zinc-400">
          Thay đổi ở đây sẽ cập nhật hồ sơ tác giả công khai và đồng bộ vào
          trang hồ sơ của bạn.
        </p>
      </Card>
    </section>
  );
}
