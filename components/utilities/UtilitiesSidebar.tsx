"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { UtilityStarIcon } from "@/components/utilities/UtilityStarIcon";
import {
  getUtilitiesNavGroups,
  isUtilityNavActive,
  UTILITIES_HUB_NAV,
  type UtilityNavItem
} from "@/lib/utilities/navigation";

type UtilitiesSidebarProps = {
  onNavigate?: () => void;
  variant?: "desktop" | "drawer";
};

function NavLink({
  active,
  item,
  onNavigate
}: {
  active: boolean;
  item: UtilityNavItem;
  onNavigate?: () => void;
}) {
  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={`tap-highlight flex min-w-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-[0.8125rem] font-semibold leading-snug transition ${
        active
          ? "bg-cyan-300/12 text-cyan-100 ring-1 ring-cyan-300/20"
          : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-100"
      }`}
      href={item.href}
      onClick={onNavigate}
      title={item.description}
    >
      <span aria-hidden="true" className="shrink-0 text-sm leading-none">
        {item.id === "hub" ? (
          <UtilityStarIcon className="size-3.5 text-emerald-400" />
        ) : (
          item.icon
        )}
      </span>
      <span className="min-w-0 truncate">{item.label}</span>
    </Link>
  );
}

export function UtilitiesSidebar({ onNavigate, variant = "desktop" }: UtilitiesSidebarProps) {
  const pathname = usePathname();
  const groups = getUtilitiesNavGroups();

  return (
    <nav aria-label="Tiện ích" className={variant === "drawer" ? "space-y-3" : "space-y-2"}>
      <div className="space-y-0.5">
        <NavLink
          active={isUtilityNavActive(pathname, UTILITIES_HUB_NAV)}
          item={UTILITIES_HUB_NAV}
          onNavigate={onNavigate}
        />
      </div>

      {groups.map((group) => (
        <div className="space-y-0.5" key={group.id}>
          <p className="px-2 pb-0.5 pt-1.5 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-zinc-500">
            {group.label}
          </p>
          <div className="space-y-0.5">
            {group.items.map((item) => (
              <NavLink
                active={isUtilityNavActive(pathname, item)}
                item={item}
                key={item.id}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>
      ))}

      {variant === "desktop" ? (
        <Link
          className="tap-highlight mx-1 mt-1 inline-flex items-center gap-1 text-[0.6875rem] font-semibold text-zinc-500 transition hover:text-zinc-300"
          href="/"
        >
          ← Về ChapMee
        </Link>
      ) : null}
    </nav>
  );
}

function MenuIcon() {
  return (
    <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24">
      <path
        d="M4 7h16M4 12h16M4 17h16"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24">
      <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

export function UtilitiesMobileHeaderMenu() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const previous = document.body.style.overflow;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const closeMenu = () => setOpen(false);

  return (
    <>
      <button
        aria-expanded={open}
        aria-label="Mở menu tiện ích"
        className="tap-highlight inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-zinc-100 hover:bg-white/[0.06]"
        onClick={() => setOpen(true)}
        type="button"
      >
        <MenuIcon />
      </button>

      {mounted && open
        ? createPortal(
            <div className="fixed inset-0 z-[200] lg:hidden">
              <button
                aria-label="Đóng menu tiện ích"
                className="absolute inset-0 bg-black/70"
                onClick={closeMenu}
                type="button"
              />
              <aside className="absolute bottom-0 left-0 top-0 flex w-[min(16rem,84vw)] flex-col overflow-hidden border-r border-white/10 bg-[#0a1017] shadow-2xl">
                <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-3 py-2.5 pt-[calc(env(safe-area-inset-top)+0.625rem)]">
                  <p className="text-sm font-bold text-white">Tiện ích</p>
                  <button
                    aria-label="Đóng"
                    className="tap-highlight inline-flex size-8 items-center justify-center rounded-lg border border-white/10 text-zinc-200"
                    onClick={closeMenu}
                    type="button"
                  >
                    <CloseIcon />
                  </button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2.5 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
                  <UtilitiesSidebar onNavigate={closeMenu} variant="drawer" />
                </div>
              </aside>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
