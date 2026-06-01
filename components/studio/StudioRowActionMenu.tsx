"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

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
};

export function StudioRowActionMenu({
  ariaLabel = "Tùy chọn",
  items,
  mobileSheet = false
}: StudioRowActionMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isMobile, setIsMobile] = useState(false);

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

  const useSheet = mobileSheet && isMobile;

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

  return (
    <div className="relative shrink-0">
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={ariaLabel}
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-lg text-zinc-300 transition hover:bg-white/10 disabled:opacity-50"
        disabled={isPending}
        onClick={() => setOpen((value) => !value)}
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

      {open && !useSheet ? (
        <>
          <button
            aria-label="Đóng menu"
            className="fixed inset-0 z-20 cursor-default"
            onClick={() => setOpen(false)}
            type="button"
          />
          <div
            className="absolute right-0 top-full z-30 mt-1 min-w-[12rem] max-w-[16rem] rounded-xl border border-white/10 bg-[#121820] p-1 shadow-xl"
            role="menu"
          >
            {renderItems("block rounded-lg px-3 py-2 text-left text-sm hover:bg-white/5")}
          </div>
        </>
      ) : null}

      {error ? (
        <p className="absolute right-0 top-full z-30 mt-12 max-w-[14rem] rounded-lg border border-rose-400/30 bg-rose-950/80 px-2 py-1 text-xs text-rose-200">
          {error}
        </p>
      ) : null}
    </div>
  );
}
