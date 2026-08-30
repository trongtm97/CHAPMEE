import Link from "next/link";
import { Suspense } from "react";
import { DesktopMePage } from "@/components/me/DesktopMePage";
import { MePageShell } from "@/components/me/MePageShell";
import { MobileMePage } from "@/components/me/MobileMePage";
import {
  MeDesktopMonetizationFallback,
  MeDesktopMonetizationSection
} from "@/components/me/server/MeDesktopMonetizationSection";
import { ErrorState } from "@/components/ui";
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
      <section className="mx-auto w-full max-w-lg space-y-4 px-1 py-4 lg:max-w-none lg:px-0">
        <div className="rounded-2xl border border-white/8 bg-gradient-to-br from-cyan-500/10 via-zinc-900/80 to-zinc-950 p-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300/90">
            Trung tâm cá nhân
          </p>
          <h1 className="mt-3 text-2xl font-black text-white">Đăng nhập để tiếp tục</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            Đăng nhập để quản lý hồ sơ, đọc tiếp, tủ truyện và tin nhắn.
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-cyan-300 px-5 text-sm font-bold text-zinc-950 transition hover:bg-cyan-200"
              href="/login"
            >
              Đăng nhập
            </Link>
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/12 bg-white/[0.04] px-5 text-sm font-semibold text-zinc-100 transition hover:border-white/20"
              href="/discover"
            >
              Khám phá truyện
            </Link>
          </div>
        </div>
        {error ? (
          <ErrorState className="mt-2" message={error} title="Không thể tải hồ sơ" />
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
