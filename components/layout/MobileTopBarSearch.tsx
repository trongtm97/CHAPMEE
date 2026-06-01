"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AppSearchBar } from "@/components/ui/AppSearchBar";

const iconButtonClass =
  "tap-highlight flex size-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-zinc-300 transition hover:border-cyan-300/25 hover:text-cyan-100";

export function MobileTopBarSearch() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  function handleSearch(query: string) {
    setOpen(false);
    if (!query) {
      router.push("/discover");
      return;
    }
    router.push(`/discover?q=${encodeURIComponent(query)}`);
  }

  return (
    <>
      <button
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Tìm truyện"
        className={iconButtonClass}
        onClick={() => setOpen(true)}
        type="button"
      >
        <SearchIcon />
      </button>

      {open ? (
        <div className="fixed inset-0 z-[100] lg:hidden" role="presentation">
          <button
            aria-label="Đóng tìm kiếm"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            type="button"
          />
          <div
            className="relative mx-auto w-full max-w-lg px-3 pt-[calc(env(safe-area-inset-top)+0.75rem)]"
            ref={panelRef}
            role="dialog"
            aria-label="Tìm truyện"
          >
            <div className="rounded-2xl border border-white/10 bg-[#0b1016] p-3 shadow-2xl">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-sm font-bold text-white">Tìm truyện</p>
                <button
                  className="min-h-9 rounded-full px-3 text-xs font-semibold text-zinc-400 transition hover:text-white"
                  onClick={() => setOpen(false)}
                  type="button"
                >
                  Đóng
                </button>
              </div>
              <AppSearchBar autoFocus onSearch={handleSearch} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" className="size-4" fill="none" viewBox="0 0 24 24">
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="m16 16 4 4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}
