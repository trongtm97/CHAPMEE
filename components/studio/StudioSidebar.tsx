"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { STUDIO_BASE_PATH } from "@/lib/studio/constants";
import { STUDIO_NAV_ITEMS, type StudioNavItem } from "@/lib/studio/navigation";

type StudioSidebarProps = {
  variant?: "desktop" | "compact";
};

function isActive(pathname: string, item: StudioNavItem) {
  const href = item.href;
  const match = item.match;
  if (href.includes("#")) {
    return pathname === STUDIO_BASE_PATH;
  }

  if (match === "exact") {
    return pathname === href;
  }

  return pathname.startsWith(href);
}

export function StudioSidebar({ variant = "desktop" }: StudioSidebarProps) {
  const pathname = usePathname();
  const isDesktop = variant === "desktop";

  return (
    <nav
      aria-label="Điều hướng Studio"
      className={isDesktop ? "space-y-1" : "flex gap-2 overflow-x-auto pb-1"}
    >
      {STUDIO_NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item);

        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={`tap-highlight shrink-0 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 ${
              isDesktop
                ? `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold ${
                    active
                      ? "bg-sky-300/12 text-sky-200"
                      : "text-zinc-300 hover:bg-white/5 hover:text-white"
                  }`
                : `inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold ${
                    active
                      ? "border-sky-300 bg-sky-300 text-zinc-950"
                      : "border-white/10 bg-white/5 text-zinc-300 hover:border-white/20 hover:bg-white/10 hover:text-white"
                  }`
            }`}
            href={item.href}
            key={item.id}
          >
            {isDesktop ? (
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-black ${
                  active
                    ? "bg-sky-300 text-zinc-950"
                    : "bg-white/5 text-zinc-400"
                }`}
              >
                {item.label.charAt(0)}
              </span>
            ) : null}
            <span className="whitespace-nowrap">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
