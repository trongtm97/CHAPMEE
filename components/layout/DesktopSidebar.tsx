"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import {
  ArticleNavIcon,
  CommunityNavIcon,
  DiscoverNavIcon,
  LibraryNavIcon,
  ProfileNavIcon,
  ReelsNavIcon,
  StudioNavIcon,
  WalletNavIcon
} from "@/components/navigation/AppNavIcons";

type SidebarLink = {
  href: string;
  label: string;
  icon: (props: { className?: string; active?: boolean }) => ReactNode;
};

const readerLinks: SidebarLink[] = [
  { href: "/reels", label: "Reels", icon: ReelsNavIcon },
  { href: "/discover", label: "Khám phá", icon: DiscoverNavIcon },
  { href: "/truyen", label: "Danh mục truyện", icon: LibraryNavIcon },
  { href: "/community", label: "Cộng đồng", icon: CommunityNavIcon },
  { href: "/bai-viet", label: "Bài viết", icon: ArticleNavIcon },
  { href: "/studio", label: "Studio", icon: StudioNavIcon },
  { href: "/wallet", label: "Ví coin", icon: WalletNavIcon },
  { href: "/me", label: "Hồ sơ", icon: ProfileNavIcon }
];

function isActive(pathname: string, href: string) {
  if (href === "/reels") {
    return pathname === "/" || pathname.startsWith("/reels");
  }
  if (href === "/discover") {
    return pathname.startsWith("/discover");
  }
  return pathname.startsWith(href);
}

type DesktopSidebarProps = {
  adminMode?: boolean;
};

export function DesktopSidebar({ adminMode = false }: DesktopSidebarProps) {
  if (adminMode) {
    return <AdminSidebar />;
  }

  const pathname = usePathname();
  const [searchValue, setSearchValue] = useState("");
  const links = readerLinks;
  const filteredLinks = useMemo(() => {
    const normalizedSearch = searchValue.trim().toLowerCase();
    if (!normalizedSearch) {
      return links;
    }
    return links.filter((link) => link.label.toLowerCase().includes(normalizedSearch));
  }, [links, searchValue]);

  return (
    <aside className="sticky top-0 hidden h-dvh w-[260px] shrink-0 border-r border-white/10 bg-[#0a1017]/95 lg:flex lg:flex-col">
      <div className="border-b border-white/10 px-4 py-4">
        <label className="sr-only" htmlFor="desktop-nav-search">
          Tìm kiếm điều hướng
        </label>
        <input
          className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-cyan-300/50 focus:outline-none"
          id="desktop-nav-search"
          onChange={(event) => setSearchValue(event.target.value)}
          placeholder="Tìm kiếm..."
          type="search"
          value={searchValue}
        />
      </div>

      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {filteredLinks.map((link) => {
          const active = isActive(pathname, link.href);
          const Icon = link.icon;
          return (
            <Link
              className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                active
                  ? "bg-cyan-300/15 text-cyan-200"
                  : "text-zinc-300 hover:bg-white/5 hover:text-white"
              }`}
              href={link.href}
              key={link.href}
            >
              <Icon active={active} className="size-5 shrink-0" />
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
