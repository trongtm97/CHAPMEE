"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { isNavActive, isReelsNavRoute, MOBILE_BOTTOM_NAV } from "@/lib/navigation/nav-items";

export function MobileBottomNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");
  const isReels = isReelsNavRoute(pathname);
  const navWidthClass = isReels ? "max-w-[28rem]" : "max-w-[36rem]";

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 px-2 pb-[calc(env(safe-area-inset-bottom)+0.2rem)] md:hidden">
      <div
        className={`mx-auto grid w-full ${navWidthClass} grid-cols-5 gap-0.5 rounded-2xl border border-white/[0.08] bg-[#0b1016]/90 p-0.5 backdrop-blur-2xl ${
          isReels ? "h-[3.25rem]" : "h-[3.75rem]"
        }`}
      >
        {MOBILE_BOTTOM_NAV.map((item) => {
          const active = isNavActive(pathname, item.href, tab);
          const Icon = item.icon;
          if (!Icon) {
            return null;
          }

          return (
            <Link
              aria-current={active ? "page" : undefined}
              aria-label={item.label}
              className={`tap-highlight flex min-w-0 flex-col items-center justify-center gap-px rounded-xl px-0.5 py-0.5 text-center transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 ${
                active
                  ? "bg-cyan-300/12 text-cyan-200 shadow-[inset_0_0_0_1px_rgba(125,211,252,0.12)]"
                  : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-200"
              }`}
              href={item.href}
              key={item.href}
              prefetch={!active}
            >
              <Icon active={active} />
              <span className="w-full truncate text-[0.6rem] font-semibold leading-none sm:text-[0.625rem]">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
