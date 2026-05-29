"use client";

import Link from "next/link";
import { goBackOrFallback } from "@/lib/navigation/goBackOrFallback";

type LibraryHeaderProps = {
  searchOpen: boolean;
  searchQuery: string;
  onSearchToggle: () => void;
  onSearchChange: (value: string) => void;
  onCreateCollection: () => void;
};

export function LibraryHeader({
  onCreateCollection,
  onSearchChange,
  onSearchToggle,
  searchOpen,
  searchQuery
}: LibraryHeaderProps) {
  return (
    <div className="space-y-2">
      <header className="sticky top-0 z-20 -mx-1 border-b border-white/6 bg-[#0b1016]/95 px-1 py-2 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <button
            aria-label="Quay lại Hồ sơ"
            className="tap-highlight inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-full text-zinc-100 transition hover:bg-white/6"
            onClick={() => goBackOrFallback("/me")}
            type="button"
          >
            <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24">
              <path
                d="M14.5 6.5 9 12l5.5 5.5"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
              />
            </svg>
          </button>

          <div className="min-w-0 flex-1">
            <p className="hidden truncate text-[0.62rem] text-zinc-500 sm:block">
              <Link className="hover:text-zinc-300" href="/me">
                Hồ sơ
              </Link>
              {" / "}
              <span className="text-zinc-400">Tủ truyện</span>
            </p>
            <h1 className="truncate text-base font-bold text-white">Tủ truyện</h1>
          </div>

          <div className="flex shrink-0 items-center gap-0.5">
            <button
              aria-label="Tìm kiếm"
              className="tap-highlight inline-flex min-h-9 min-w-9 items-center justify-center rounded-full text-zinc-200 hover:bg-white/6"
              onClick={onSearchToggle}
              type="button"
            >
              <SearchIcon active={searchOpen} />
            </button>
            <button
              aria-label="Tạo tủ"
              className="tap-highlight inline-flex min-h-9 min-w-9 items-center justify-center rounded-full text-cyan-200 hover:bg-cyan-300/10"
              onClick={onCreateCollection}
              type="button"
            >
              <PlusIcon />
            </button>
          </div>
        </div>
      </header>

      {searchOpen ? (
        <div className="px-0.5">
          <input
            autoFocus
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-cyan-300/30"
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Tìm trong tủ truyện..."
            type="search"
            value={searchQuery}
          />
        </div>
      ) : null}
    </div>
  );
}

function SearchIcon({ active }: { active: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={`size-[1.15rem] ${active ? "text-cyan-200" : ""}`}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="m16 16 4.5 4.5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg aria-hidden="true" className="size-[1.15rem]" fill="none" viewBox="0 0 24 24">
      <path d="M12 6v12M6 12h12" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}
