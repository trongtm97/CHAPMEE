import Link from "next/link";

export function SwipeTeaserCard() {
  return (
    <Link
      className="tap-highlight block overflow-hidden rounded-2xl border border-cyan-300/25 bg-gradient-to-br from-cyan-400/20 via-sky-500/10 to-indigo-500/20 p-3.5 transition hover:border-cyan-300/45"
      href="/swipe"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-zinc-50">Không biết đọc gì?</p>
          <p className="mt-1 text-xs leading-relaxed text-zinc-300">Lướt 10 giây để tìm truyện hợp gu.</p>
        </div>
        <span className="shrink-0 rounded-full bg-cyan-300 px-3 py-2 text-[11px] font-black text-zinc-950">
          Swipe →
        </span>
      </div>
      <p className="mt-2.5 text-xs font-bold text-cyan-100">Khám phá bằng Swipe →</p>
    </Link>
  );
}
