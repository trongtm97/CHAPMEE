"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useTransition,
  type CSSProperties
} from "react";
import { createPortal } from "react-dom";

type MenuItem =
  | {
      type: "link";
      label: string;
      href: string;
    }
  | {
      type: "action";
      label: string;
      destructive?: boolean;
      confirmMessage?: string;
      onAction: () => Promise<{ ok: boolean; error?: string }>;
    };

type StudioRowActionMenuProps = {
  items: MenuItem[];
  ariaLabel?: string;
  /** Trên mobile dùng bottom sheet thay vì dropdown. */
  mobileSheet?: boolean;
  /** Ưu tiên mở menu lên trên nút. */
  preferOpenUpward?: boolean;
};

const MENU_WIDTH = 192;

export function StudioRowActionMenu({
  ariaLabel = "Tùy chọn",
  items,
  mobileSheet = false,
  preferOpenUpward = false
}: StudioRowActionMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isMobile, setIsMobile] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mobileSheet) {
      return;
    }

    const media = window.matchMedia("(max-width: 1023px)");

    function sync() {
      setIsMobile(media.matches);
    }

    sync();
    media.addEventListener("change", sync);

    return () => media.removeEventListener("change", sync);
  }, [mobileSheet]);

  const useSheet = mobileSheet && isMobile;

  useLayoutEffect(() => {
    if (!open || useSheet || !triggerRef.current) {
      return;
    }

    function positionMenu() {
      const trigger = triggerRef.current;
      const menu = menuRef.current;

      if (!trigger) {
        return;
      }

      const rect = trigger.getBoundingClientRect();
      const menuHeight = menu?.offsetHeight ?? Math.min(items.length * 40 + 8, 320);
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const openUp =
        preferOpenUpward || (spaceBelow < menuHeight + 12 && spaceAbove > spaceBelow);

      const left = Math.max(
        8,
        Math.min(rect.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8)
      );

      setMenuStyle({
        left,
        maxHeight: "min(20rem, calc(100vh - 1rem))",
        overflowY: "auto",
        position: "fixed",
        top: openUp ? Math.max(8, rect.top - menuHeight - 4) : rect.bottom + 4,
        width: MENU_WIDTH,
        zIndex: 60
      });
    }

    positionMenu();
    window.addEventListener("resize", positionMenu);
    window.addEventListener("scroll", positionMenu, true);

    return () => {
      window.removeEventListener("resize", positionMenu);
      window.removeEventListener("scroll", positionMenu, true);
    };
  }, [items.length, open, preferOpenUpward, useSheet]);

  async function runAction(item: Extract<MenuItem, { type: "action" }>) {
    if (item.confirmMessage && !window.confirm(item.confirmMessage)) {
      return;
    }

    setError(null);

    startTransition(async () => {
      const result = await item.onAction();

      if (!result.ok) {
        setError(result.error ?? "Không thực hiện được thao tác.");
        return;
      }

      setOpen(false);
      router.refresh();
    });
  }

  function renderItems(className: string) {
    return items.map((item) =>
      item.type === "link" ? (
        <Link
          className={`${className} text-zinc-200`}
          href={item.href}
          key={item.href + item.label}
          onClick={() => setOpen(false)}
        >
          {item.label}
        </Link>
      ) : (
        <button
          className={`${className} w-full disabled:opacity-50 ${
            item.destructive ? "text-rose-300" : "text-zinc-200"
          }`}
          disabled={isPending}
          key={item.label}
          onClick={() => runAction(item)}
          type="button"
        >
          {item.label}
        </button>
      )
    );
  }

  const dropdownMenu =
    open && !useSheet ? (
      <>
        <button
          aria-label="Đóng menu"
          className="fixed inset-0 z-50 cursor-default bg-transparent"
          onClick={() => setOpen(false)}
          type="button"
        />
        <div
          className="rounded-xl border border-white/10 bg-[#121820] p-1 shadow-xl"
          ref={menuRef}
          role="menu"
          style={menuStyle}
        >
          {renderItems("block rounded-lg px-3 py-2 text-left text-sm hover:bg-white/5")}
        </div>
      </>
    ) : null;

  return (
    <div className="relative shrink-0">
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={ariaLabel}
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-lg text-zinc-300 transition hover:bg-white/10 disabled:opacity-50"
        disabled={isPending}
        onClick={() => setOpen((value) => !value)}
        ref={triggerRef}
        type="button"
      >
        ⋯
      </button>

      {open && useSheet ? (
        <>
          <button
            aria-label="Đóng menu"
            className="fixed inset-0 z-40 bg-black/60"
            onClick={() => setOpen(false)}
            type="button"
          />
          <div
            className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border border-white/10 bg-zinc-950 p-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-2xl"
            role="menu"
          >
            <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-white/20" />
            {renderItems(
              "block rounded-xl px-4 py-3 text-left text-sm font-medium hover:bg-white/5"
            )}
          </div>
        </>
      ) : null}

      {typeof document !== "undefined" && dropdownMenu
        ? createPortal(dropdownMenu, document.body)
        : null}

      {error ? (
        <p className="absolute right-0 top-full z-30 mt-12 max-w-[14rem] rounded-lg border border-rose-400/30 bg-rose-950/80 px-2 py-1 text-xs text-rose-200">
          {error}
        </p>
      ) : null}
    </div>
  );
}
