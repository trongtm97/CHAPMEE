"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { StudioNavIcon, WalletNavIcon, ProfileNavIcon } from "@/components/navigation/AppNavIcons";
import { isNavActive, SIDEBAR_EXPLORE_NAV } from "@/lib/navigation/nav-items";

type SidebarLink = {
  href: string;
  label: string;
  icon: (props: { className?: string; active?: boolean }) => ReactNode;
};

const accountLinks: SidebarLink[] = [
  { href: "/studio", label: "Studio", icon: StudioNavIcon },
  { href: "/wallet", label: "Ví Xu", icon: WalletNavIcon },
  { href: "/me", label: "Hồ sơ", icon: ProfileNavIcon }
];

function SidebarSection({
  title,
  links,
  pathname,
  tab
}: {
  title?: string;
  links: SidebarLink[];
  pathname: string;
  tab: string | null;
}) {
  return (
    <div className="space-y-0.5">
      {title ? (
        <p className="px-2 pb-1 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-zinc-500">
          {title}
        </p>
      ) : null}
      {links.map((link) => {
        const active = isNavActive(pathname, link.href, tab);
        const Icon = link.icon;
        return (
          <Link
            className={`flex items-center gap-2 rounded-lg px-2 py-2 text-[0.8125rem] font-semibold transition ${
              active
                ? "bg-cyan-300/12 text-cyan-100"
                : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-100"
            }`}
            href={link.href}
            key={link.href}
          >
            <Icon active={active} className="size-[1.125rem] shrink-0" />
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}

type DesktopSidebarProps = {
  adminMode?: boolean;
};

export function DesktopSidebar({ adminMode = false }: DesktopSidebarProps) {
  if (adminMode) {
    return <AdminSidebar />;
  }

  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");

  const exploreLinks: SidebarLink[] = SIDEBAR_EXPLORE_NAV.filter(
    (item): item is SidebarLink => Boolean(item.icon)
  );

  return (
    <aside className="sticky top-12 hidden h-[calc(100dvh-3rem)] w-[220px] shrink-0 border-r border-white/10 bg-[#0a1017]/95 lg:flex lg:flex-col">
      <nav className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-2 py-3">
        <SidebarSection links={exploreLinks} pathname={pathname} tab={tab} />
        <SidebarSection links={accountLinks} pathname={pathname} tab={tab} title="Cá nhân" />
      </nav>
    </aside>
  );
}
