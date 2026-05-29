"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { useAdminNavFlags } from "@/components/admin/AdminNavProvider";
import {
  ADMIN_OVERVIEW_LINK,
  buildAdminNavGroups,
  flattenAdminNavForSearch,
  type AdminNavGroup
} from "@/lib/admin/admin-navigation";

function isActive(pathname: string, href: string) {
  if (href === "/admin") {
    return pathname === "/admin";
  }
  return pathname.startsWith(href);
}

export function AdminSidebar() {
  const pathname = usePathname();
  const permissionFlags = useAdminNavFlags();
  const [searchValue, setSearchValue] = useState("");
  const groups = useMemo(
    () => buildAdminNavGroups(permissionFlags),
    [permissionFlags]
  );

  const flatLinks = useMemo(() => flattenAdminNavForSearch(groups), [groups]);

  const filteredGroups = useMemo(() => {
    const q = searchValue.trim().toLowerCase();
    if (!q) return groups;

    const matchingHrefs = new Set(
      flatLinks.filter((l) => l.label.toLowerCase().includes(q)).map((l) => l.href)
    );

    return groups
      .map((group) => ({
        ...group,
        items: group.items.filter(
          (item) =>
            item.label.toLowerCase().includes(q) ||
            (item.href !== "#" && matchingHrefs.has(item.href))
        )
      }))
      .filter((group) => group.items.length > 0);
  }, [groups, flatLinks, searchValue]);

  return (
    <aside className="sticky top-0 hidden h-dvh w-[260px] shrink-0 border-r border-white/10 bg-[#0a1017]/95 lg:flex lg:flex-col">
      <div className="border-b border-white/10 px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-cyan-300/90">
          ChapMee Admin
        </p>
        <label className="sr-only" htmlFor="admin-nav-search">
          Tìm trong admin
        </label>
        <input
          className="mt-3 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-cyan-300/50 focus:outline-none"
          id="admin-nav-search"
          onChange={(e) => setSearchValue(e.target.value)}
          placeholder="Tìm trong admin..."
          type="search"
          value={searchValue}
        />
      </div>

      <nav className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-3">
        <NavItem active={isActive(pathname, ADMIN_OVERVIEW_LINK.href)} item={ADMIN_OVERVIEW_LINK} />

        {filteredGroups.map((group) => (
          <NavGroup
            activePath={pathname}
            group={group}
            key={group.id}
          />
        ))}
      </nav>
    </aside>
  );
}

function NavGroup({
  group,
  activePath
}: {
  group: AdminNavGroup;
  activePath: string;
}) {
  const items = group.items.filter((item) => item.href !== "#");
  if (items.length === 0) return null;

  return (
    <div className="space-y-1">
      <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
        {group.title}
      </p>
      {items.map((item) => (
        <NavItem active={isActive(activePath, item.href)} item={item} key={item.href + item.label} />
      ))}
    </div>
  );
}

function NavItem({
  item,
  active
}: {
  item: { href: string; label: string; disabled?: boolean; disabledReason?: string };
  active: boolean;
}) {
  if (item.disabled || item.href === "#") {
    return (
      <span
        className="flex cursor-not-allowed items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm text-zinc-600"
        title={item.disabledReason}
      >
        {item.label}
      </span>
    );
  }

  return (
    <Link
      className={`block rounded-xl px-3 py-2 text-sm font-medium transition ${
        active
          ? "bg-cyan-300/15 text-cyan-200"
          : "text-zinc-300 hover:bg-white/5 hover:text-white"
      }`}
      href={item.href}
    >
      {item.label}
    </Link>
  );
}
