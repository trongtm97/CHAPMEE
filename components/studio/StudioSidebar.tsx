"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { StudioBrandMark } from "@/components/studio/dashboard/shared/StudioBrandMark";
import { STUDIO_BASE_PATH } from "@/lib/studio/constants";
import {
  STUDIO_NAV_GROUPS,
  getStudioMobileNavSections,
  type StudioNavItem
} from "@/lib/studio/navigation";

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

function NavChip({
  active,
  compact = false,
  item
}: {
  active: boolean;
  compact?: boolean;
  item: StudioNavItem;
}) {
  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={`tap-highlight inline-flex items-center rounded-full border font-semibold transition ${
        compact
          ? "h-9 w-full min-w-0 justify-center px-1.5 text-[0.65rem] leading-tight sm:text-[0.7rem]"
          : "h-8 shrink-0 px-2.5 text-[0.7rem]"
      } ${
        active
          ? "border-cyan-300 bg-cyan-300 text-zinc-950"
          : "border-white/10 bg-white/5 text-zinc-300 hover:border-white/20"
      }`}
      href={item.href}
      title={item.label}
    >
      <span className="line-clamp-2 text-center">{item.label}</span>
    </Link>
  );
}

function MoreMenuIcon() {
  return (
    <svg aria-hidden="true" className="size-3.5 shrink-0" fill="none" viewBox="0 0 24 24">
      <rect height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" width="7" x="3" y="3" />
      <rect height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" width="7" x="14" y="3" />
      <rect height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" width="7" x="3" y="14" />
      <rect height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" width="7" x="14" y="14" />
    </svg>
  );
}

function MobileMoreMenu({
  className = "",
  items
}: {
  className?: string;
  items: StudioNavItem[];
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const moreActive = items.some((item) => isActive(pathname, item));

  useEffect(() => {
    if (!open) {
      return;
    }

    function onPointerDown(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  if (items.length === 0) {
    return null;
  }

  return (
    <div className={`relative min-w-0 ${className}`} ref={ref}>
      <button
        aria-expanded={open}
        aria-label="Thêm mục Studio"
        className={`tap-highlight inline-flex h-9 w-full items-center justify-center gap-1 rounded-full border px-2 text-[0.7rem] font-bold shadow-[0_0_0_1px_rgba(103,232,249,0.15)] transition ${
          moreActive || open
            ? "border-cyan-200 bg-cyan-300 text-zinc-950 shadow-cyan-300/25"
            : "border-cyan-300/70 bg-gradient-to-br from-cyan-300/25 via-cyan-400/15 to-cyan-300/10 text-cyan-50 ring-1 ring-cyan-300/40 hover:border-cyan-200 hover:from-cyan-300/35"
        }`}
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <MoreMenuIcon />
        <span>Thêm</span>
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+0.35rem)] z-20 min-w-[10rem] rounded-xl border border-white/10 bg-zinc-950 p-1 shadow-xl">
          {items.map((item) => {
            const active = isActive(pathname, item);

            return (
              <Link
                className={`block rounded-lg px-3 py-2 text-sm transition ${
                  active
                    ? "bg-cyan-300/12 text-cyan-200"
                    : "text-zinc-300 hover:bg-white/5 hover:text-white"
                }`}
                href={item.href}
                key={item.id}
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function StudioSidebar({ variant = "desktop" }: StudioSidebarProps) {
  const pathname = usePathname();
  const isDesktop = variant === "desktop";

  if (isDesktop) {
    return (
      <nav aria-label="Điều hướng Studio" className="space-y-4">
        <div className="flex justify-center border-b border-white/10 pb-3">
          <StudioBrandMark linkToRoot={false} size="sm" />
        </div>
        {STUDIO_NAV_GROUPS.map((group) => (
          <div key={group.id}>
            <p className="mb-1.5 px-2 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-zinc-500">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(pathname, item);

                return (
                  <Link
                    aria-current={active ? "page" : undefined}
                    className={`tap-highlight flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[0.8125rem] font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 ${
                      active
                        ? "bg-cyan-300/12 text-cyan-200"
                        : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
                    } ${item.disabled ? "pointer-events-none opacity-50" : ""}`}
                    href={item.href}
                    key={item.id}
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[0.65rem] font-bold ${
                        active
                          ? "bg-cyan-300 text-zinc-950"
                          : "bg-white/5 text-zinc-500"
                      }`}
                    >
                      {item.label.charAt(0)}
                    </span>
                    <span className="truncate">{item.label}</span>
                    {item.badge ? (
                      <span className="ml-auto rounded-full bg-zinc-700 px-1.5 py-0.5 text-[0.6rem] font-bold text-zinc-300">
                        {item.badge}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    );
  }

  const { more, primary } = getStudioMobileNavSections();

  return (
    <nav aria-label="Điều hướng Studio" className="grid grid-cols-3 gap-1.5">
      {primary.map((item) => (
        <NavChip
          active={isActive(pathname, item)}
          compact
          item={item}
          key={item.id}
        />
      ))}
      <MobileMoreMenu className="min-w-0" items={more} />
    </nav>
  );
}
