"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Trang chủ", icon: HomeIcon, emphasize: false },
  { href: "/discover", label: "Khám phá", icon: SearchIcon, emphasize: false },
  { href: "/swipe", label: "Lướt", icon: SparkIcon, emphasize: true },
  { href: "/community", label: "Cộng đồng", icon: ChatIcon, emphasize: false },
  { href: "/me", label: "Tôi", icon: UserIcon, emphasize: false }
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }
  if (href === "/discover") {
    return pathname.startsWith("/discover") || pathname.startsWith("/truyen");
  }
  if (href === "/swipe") {
    return pathname.startsWith("/swipe");
  }
  return pathname.startsWith(href);
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const isSwipeRoute = pathname.startsWith("/swipe");
  const navWidthClass = isSwipeRoute ? "max-w-[28rem]" : "max-w-[36rem]";

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] md:hidden">
      <div className={`chap-card mx-auto grid h-[5.2rem] w-full ${navWidthClass} grid-cols-5 gap-1 p-1.5 backdrop-blur-2xl`}>
        {navItems.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          const isEmphasized = Boolean(item.emphasize);

          return (
            <Link
              aria-current={active ? "page" : undefined}
              className={`tap-highlight flex min-w-0 flex-col items-center justify-center gap-1 rounded-[1rem] px-1 text-center text-[0.68rem] font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 ${
                active
                  ? "bg-cyan-300/12 text-cyan-200"
                  : "text-zinc-500 hover:bg-white/5 hover:text-zinc-100 focus-visible:text-zinc-100"
              }`}
              href={item.href}
              key={item.href}
              prefetch={!active}
            >
              <span
                className={`flex items-center justify-center rounded-full border text-current ${
                  isEmphasized ? "h-9 w-9" : "h-8 w-8"
                } ${
                  active
                    ? "border-cyan-300/30 bg-cyan-300 text-zinc-950 shadow-[0_0_0_1px_rgba(125,211,252,0.18)]"
                    : isEmphasized
                      ? "border-cyan-200/25 bg-cyan-300/15 text-cyan-100"
                      : "border-white/10 bg-white/[0.04]"
                }`}
              >
                <Icon />
              </span>
              <span className="w-full truncate leading-none">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function HomeIcon() {
  return (
    <svg aria-hidden="true" className="size-4" fill="none" viewBox="0 0 24 24">
      <path
        d="M4 11.5 12 4l8 7.5v8.5a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1v-8.5Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg aria-hidden="true" className="size-4" fill="none" viewBox="0 0 24 24">
      <path
        d="M12 3.5 13.9 9.1 19.5 11 13.9 12.9 12 18.5 10.1 12.9 4.5 11 10.1 9.1 12 3.5Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" className="size-4" fill="none" viewBox="0 0 24 24">
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="m16 16 4 4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg aria-hidden="true" className="size-4" fill="none" viewBox="0 0 24 24">
      <path
        d="M5 6.5h14a1 1 0 0 1 1 1V15a1 1 0 0 1-1 1H9.2L5 20v-4H5a1 1 0 0 1-1-1V7.5a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg aria-hidden="true" className="size-4" fill="none" viewBox="0 0 24 24">
      <path
        d="M12 13a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm-7 7a7 7 0 0 1 14 0"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}
