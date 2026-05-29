import Link from "next/link";

export function DiscoverCatalogEntry() {
  return (
    <Link
      className="tap-highlight chap-card-soft mt-4 block rounded-2xl border-cyan-300/15 p-3.5 transition hover:border-cyan-300/35"
      href="/truyen"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-black text-zinc-50">Danh mục truyện</p>
          <p className="mt-1 text-xs text-zinc-300">Xem tất cả truyện hiện có trên ChapMee</p>
        </div>
        <span className="shrink-0 text-xs font-bold text-cyan-200">Vào danh mục →</span>
      </div>
    </Link>
  );
}
