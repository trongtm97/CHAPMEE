import Link from "next/link";
import { Suspense } from "react";
import { DesktopMePage } from "@/components/me/DesktopMePage";
import { MePageShell } from "@/components/me/MePageShell";
import { MobileMePage } from "@/components/me/MobileMePage";
import {
  MeDesktopMonetizationFallback,
  MeDesktopMonetizationSection
} from "@/components/me/server/MeDesktopMonetizationSection";
import { EmptyState, ErrorState } from "@/components/ui";
import { MePageSkeleton } from "@/components/ui/navigation-skeletons";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { loadMePageCore } from "@/lib/me/loadMePageCore";

export const dynamic = "force-dynamic";

type MePageAuthenticatedProps = {
  error: string | null;
  profile: Awaited<ReturnType<typeof getCurrentUser>>["profile"];
  user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>["user"]>;
};

async function MePageAuthenticated({ error, profile, user }: MePageAuthenticatedProps) {
  const data = await loadMePageCore({ user, profile, refreshError: error });

  return (
    <MePageShell>
      <MobileMePage data={data} />
      <DesktopMePage
        data={data}
        monetizationSection={
          <Suspense fallback={<MeDesktopMonetizationFallback />}>
            <MeDesktopMonetizationSection role={profile?.role} userId={user.id} />
          </Suspense>
        }
      />
    </MePageShell>
  );
}

export default async function MePage() {
  const { error, profile, user } = await getCurrentUser();

  if (!user) {
    return (
      <section>
        <p className="text-sm font-medium uppercase tracking-wide text-cyan-300">Tôi</p>
        <h1 className="mt-3 text-3xl font-bold tracking-normal">Trung tâm cá nhân</h1>
        <p className="mt-4 text-base leading-7 text-zinc-300">
          Đăng nhập để lưu truyện, theo dõi tác giả và khoe thành tích đọc.
        </p>
        <div className="mt-8">
          <EmptyState
            action={
              <div className="grid gap-3 sm:grid-cols-2">
                <Link
                  className="inline-flex min-h-11 items-center justify-center rounded-lg bg-cyan-300 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-200"
                  href="/login"
                >
                  Đăng nhập
                </Link>
                <Link
                  className="inline-flex min-h-11 items-center justify-center rounded-lg bg-zinc-800 px-4 py-2 text-sm font-semibold text-zinc-100 transition hover:bg-zinc-700"
                  href="/register"
                >
                  Đăng ký
                </Link>
              </div>
            }
            description="Bạn vẫn có thể đọc nội dung công khai. Tài khoản sẽ giữ lại tủ truyện, lịch sử đọc và các thành tích."
            title="Bạn chưa đăng nhập"
          />
        </div>
        {error ? (
          <ErrorState
            className="mt-4"
            message={error}
            title="Không thể tải hồ sơ"
          />
        ) : null}
      </section>
    );
  }

  return (
    <Suspense fallback={<MePageSkeleton />}>
      <MePageAuthenticated error={error} profile={profile} user={user} />
    </Suspense>
  );
}
