"use client";

import Link from "next/link";
import { ChapMeeLogo } from "@/components/brand/ChapMeeLogo";
import { usePathname } from "next/navigation";
import { MessageNavLink } from "@/components/messages/MessageNavLink";

const primaryLinks = [
  { href: "/swipe", label: "Swipe" },
  { href: "/discover", label: "Khám phá" },
  { href: "/truyen", label: "Danh mục truyện" },
  { href: "/rankings", label: "Bảng xếp hạng" },
  { href: "/community", label: "Cộng đồng" }
] as const;

const utilityLinks: ReadonlyArray<{ href: string; label: string; emphasized?: boolean }> = [
  { href: "/studio/stories/new", label: "Viết truyện", emphasized: true },
  { href: "/studio", label: "Studio" },
  { href: "/wallet", label: "Ví/Coin" },
  { href: "/notifications", label: "Thông báo" },
  { href: "/profile", label: "Hồ sơ" }
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function DesktopHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 hidden border-b border-white/10 bg-[#0b1016]/85 backdrop-blur-xl lg:block">
      <div className="mx-auto flex h-16 w-full max-w-screen-2xl items-center justify-between gap-6 px-6 xl:px-8">
        <Link className="flex items-center gap-3" href="/">
          <ChapMeeLogo height={34} priority />
        </Link>

        <nav className="flex min-w-0 items-center gap-1">
          {primaryLinks.map((link) => {
            const active = isActive(pathname, link.href);
            return (
              <Link
                className={`rounded-full px-3 py-2 text-sm font-semibold transition ${
                  active
                    ? "bg-cyan-300/15 text-cyan-200"
                    : "text-zinc-300 hover:bg-white/5 hover:text-white"
                } ${link.href === "/swipe" ? "border border-cyan-300/20" : ""}`}
                href={link.href}
                key={link.href}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            className="rounded-full border border-cyan-300/35 bg-cyan-300/10 px-3 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20"
            href="/discover"
          >
            Tìm kiếm
          </Link>
          <MessageNavLink />
          {utilityLinks.map((link) => {
            const active = isActive(pathname, link.href);
            const className = link.emphasized === true
              ? "rounded-full bg-cyan-300 px-3 py-2 text-sm font-bold text-zinc-950 transition hover:bg-cyan-200"
              : `rounded-full border px-3 py-2 text-sm font-semibold transition ${
                  active
                    ? "border-cyan-300/40 bg-cyan-300/12 text-cyan-100"
                    : "border-white/10 text-zinc-200 hover:border-cyan-300/40 hover:text-cyan-100"
                }`;

            return (
              <Link className={className} href={link.href} key={link.href}>
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}
