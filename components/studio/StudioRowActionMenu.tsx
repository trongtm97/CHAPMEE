"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

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
};

export function StudioRowActionMenu({
  ariaLabel = "Tùy chọn",
  items
}: StudioRowActionMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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

      {open ? (
        <>
          <button
            aria-label="Đóng menu"
            className="fixed inset-0 z-20 cursor-default"
            onClick={() => setOpen(false)}
            type="button"
          />
          <div className="absolute right-0 top-full z-30 mt-1 min-w-[12rem] max-w-[16rem] rounded-xl border border-white/10 bg-[#121820] p-1 shadow-xl">
            {items.map((item) =>
              item.type === "link" ? (
                <Link
                  className="block rounded-lg px-3 py-2 text-left text-sm text-zinc-200 hover:bg-white/5"
                  href={item.href}
                  key={item.href + item.label}
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              ) : (
                <button
                  className={`block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-white/5 disabled:opacity-50 ${
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
            )}
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
