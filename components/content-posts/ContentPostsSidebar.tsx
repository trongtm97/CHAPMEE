"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  PUBLIC_POST_CATEGORY_OPTIONS,
  buildPublicPostListQuery,
  type PublicPostCategoryFilter
} from "@/lib/content-posts/public-catalog";
import type { ContentPostCategory } from "@/types/platform-content";

type ContentPostsSidebarProps = {
  categories: ContentPostCategory[];
  onNavigate?: () => void;
  variant?: "desktop" | "drawer";
};

function isCategoryActive(
  pathname: string,
  searchParams: URLSearchParams,
  value: PublicPostCategoryFilter
): boolean {
  if (pathname !== "/bai-viet") {
    return false;
  }
  const current = (searchParams.get("category") ?? "all") as PublicPostCategoryFilter;
  return current === value;
}

function NavLink({
  active,
  href,
  label,
  onNavigate
}: {
  active: boolean;
  href: string;
  label: string;
  onNavigate?: () => void;
}) {
  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={`tap-highlight block rounded-lg px-2 py-1.5 text-[0.8125rem] font-semibold leading-snug transition ${
        active
          ? "bg-cyan-300/12 text-cyan-100 ring-1 ring-cyan-300/20"
          : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-100"
      }`}
      href={href}
      onClick={onNavigate}
    >
      {label}
    </Link>
  );
}

export function ContentPostsSidebar({
  categories,
  onNavigate,
  variant = "desktop"
}: ContentPostsSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <nav aria-label="Danh mục bài viết" className={variant === "drawer" ? "space-y-3" : "space-y-2"}>
      <div className="space-y-0.5">
        <p className="px-2 pb-0.5 pt-1.5 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-zinc-500">
          Chuyên mục
        </p>
        {PUBLIC_POST_CATEGORY_OPTIONS.map((option) => {
          const href = `/bai-viet${buildPublicPostListQuery({
            page: 1,
            category: option.value
          })}`;
          return (
            <NavLink
              active={isCategoryActive(pathname, searchParams, option.value)}
              href={href}
              key={option.value}
              label={option.label}
              onNavigate={onNavigate}
            />
          );
        })}
      </div>

      {categories.length > 0 ? (
        <div className="space-y-0.5">
          <p className="px-2 pb-0.5 pt-1.5 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-zinc-500">
            Danh mục
          </p>
          <NavLink
            active={pathname === "/bai-viet"}
            href="/bai-viet"
            label="Tất cả bài viết"
            onNavigate={onNavigate}
          />
          {categories.map((cat) => (
            <NavLink
              active={pathname === `/bai-viet/danh-muc/${cat.slug}`}
              href={`/bai-viet/danh-muc/${cat.slug}`}
              key={cat.id}
              label={cat.name}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      ) : null}

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

export function ContentPostsMobileHeaderMenu({
  categories
}: {
  categories: ContentPostCategory[];
}) {
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
        aria-label="Mở menu bài viết"
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
                aria-label="Đóng menu bài viết"
                className="absolute inset-0 bg-black/70"
                onClick={closeMenu}
                type="button"
              />
              <aside className="absolute bottom-0 left-0 top-0 flex w-[min(16rem,84vw)] flex-col overflow-hidden border-r border-white/10 bg-[#0a1017] shadow-2xl">
                <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-3 py-2.5 pt-[calc(env(safe-area-inset-top)+0.625rem)]">
                  <p className="text-sm font-bold text-white">Bài viết</p>
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
                  <ContentPostsSidebar
                    categories={categories}
                    onNavigate={closeMenu}
                    variant="drawer"
                  />
                </div>
              </aside>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
