import Link from "next/link";
import { ChapMeeLogo } from "@/components/brand/ChapMeeLogo";
import { PRIVACY_POLICY_LABEL, PRIVACY_POLICY_PATH } from "@/lib/legal/public-legal-links";

type AuthHeaderProps = {
  pathname: string;
  compact?: boolean;
};

function linkClass(active: boolean) {
  return active
    ? "text-sky-100"
    : "text-zinc-400 transition hover:text-zinc-100";
}

export function AuthHeader({ pathname, compact = false }: AuthHeaderProps) {
  return (
    <header
      className={
        compact
          ? "sticky top-0 z-20 border-b border-white/[0.08] bg-[#091018]/55 backdrop-blur-md"
          : "sticky top-0 z-20 border-b border-white/10 bg-[#091018]/84 backdrop-blur-xl"
      }
    >
      <div
        className={
          compact
            ? "mx-auto flex h-12 max-w-5xl items-center justify-between gap-3 px-4 sm:px-5 lg:px-6"
            : "mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8"
        }
      >
        <Link className="flex shrink-0 items-center" href="/">
          <ChapMeeLogo height={compact ? 24 : 28} priority />
        </Link>

        <nav className="hidden items-center gap-4 sm:flex">
          <Link
            className={`text-sm ${linkClass(pathname.startsWith("/discover"))}`}
            href="/discover"
          >
            Khám phá
          </Link>
          <Link
            className={`text-sm ${linkClass(
              pathname.startsWith("/truyen") || pathname.startsWith("/stories")
            )}`}
            href="/truyen"
          >
            Đọc truyện
          </Link>
          <Link
            className={`text-sm ${linkClass(pathname === PRIVACY_POLICY_PATH)}`}
            href={PRIVACY_POLICY_PATH}
          >
            {PRIVACY_POLICY_LABEL}
          </Link>
        </nav>

        <Link
          className={`text-xs font-medium sm:hidden ${linkClass(pathname === PRIVACY_POLICY_PATH)}`}
          href={PRIVACY_POLICY_PATH}
        >
          Quyền riêng tư
        </Link>

        {pathname === "/login" ? (
          <Link
            className={
              compact
                ? "inline-flex h-9 items-center justify-center rounded-lg border border-white/10 px-3 text-sm font-semibold text-zinc-100 transition hover:border-white/20 hover:bg-white/[0.06]"
                : "inline-flex min-h-10 items-center justify-center rounded-full border border-white/10 px-4 text-sm font-semibold text-zinc-100 transition hover:border-white/20 hover:bg-white/[0.06]"
            }
            href="/register"
          >
            Đăng ký
          </Link>
        ) : (
          <Link
            className={
              compact
                ? "inline-flex h-9 items-center justify-center rounded-lg border border-white/10 px-3 text-sm font-semibold text-zinc-100 transition hover:border-white/20 hover:bg-white/[0.06]"
                : "inline-flex min-h-10 items-center justify-center rounded-full border border-white/10 px-4 text-sm font-semibold text-zinc-100 transition hover:border-white/20 hover:bg-white/[0.06]"
            }
            href="/login"
          >
            Đăng nhập
          </Link>
        )}
      </div>
    </header>
  );
}
