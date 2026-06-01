"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CommunityNavIcon,
  DiscoverNavIcon,
  ProfileNavIcon,
  ReelsNavIcon
} from "@/components/navigation/AppNavIcons";

const navItems = [
  { href: "/", label: "Reels", icon: ReelsNavIcon },
  { href: "/discover", label: "Khám phá", icon: DiscoverNavIcon },
  { href: "/community", label: "Cộng đồng", icon: CommunityNavIcon },
  { href: "/me", label: "Tôi", icon: ProfileNavIcon }
] as const;

function isReelsRoute(pathname: string) {
  return pathname === "/" || pathname.startsWith("/reels");
}

function isActive(pathname: string, href: string) {
  if (href === "/") {
    return isReelsRoute(pathname);
  }
  if (href === "/discover") {
    return pathname.startsWith("/discover") || pathname.startsWith("/truyen");
  }
  return pathname.startsWith(href);
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const isReels = isReelsRoute(pathname);
  const navWidthClass = isReels ? "max-w-[28rem]" : "max-w-[36rem]";

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 px-2 pb-[calc(env(safe-area-inset-bottom)+0.25rem)] md:hidden">
      <div
        className={`mx-auto grid h-[3.75rem] w-full ${navWidthClass} grid-cols-4 gap-0.5 rounded-2xl border border-white/[0.08] bg-[#0b1016]/92 p-1 backdrop-blur-2xl`}
      >
        {navItems.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;

          return (
            <Link
              aria-current={active ? "page" : undefined}
              className={`tap-highlight flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1 text-center transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 ${
                active
                  ? "bg-cyan-300/12 text-cyan-200 shadow-[inset_0_0_0_1px_rgba(125,211,252,0.12)]"
                  : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-200"
              }`}
              href={item.href}
              key={item.href}
              prefetch={!active}
            >
              <Icon active={active} />
              <span className="w-full truncate text-[0.625rem] font-semibold leading-none">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
