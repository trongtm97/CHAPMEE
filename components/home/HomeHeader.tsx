import Link from "next/link";

export function HomeHeader() {
  return (
    <section className="chap-card-soft relative overflow-hidden px-5 py-6 sm:px-6 sm:py-7">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(103,232,249,0.18),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(125,211,252,0.12),transparent_26%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.03)_0%,transparent_18%,rgba(255,255,255,0.015)_38%,transparent_55%,rgba(255,255,255,0.03)_100%)] opacity-80"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-8 top-10 h-24 w-24 rounded-full bg-cyan-300/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-10 bottom-6 h-20 w-20 rounded-full bg-fuchsia-300/8 blur-3xl"
      />

      <div className="relative z-10 space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="chap-pill px-3 py-1 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-cyan-200">
            Truyện ngắn
          </span>
          <span className="chap-pill px-3 py-1 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-zinc-300">
            Chap nhanh
          </span>
          <span className="chap-pill px-3 py-1 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-zinc-300">
            Kéo để đọc
          </span>
        </div>

        <div className="space-y-4">
          <p className="page-kicker">Trang chủ</p>
          <h1 className="page-title max-w-[16ch]">
            Một cú lướt. Một cú twist. Một truyện khiến bạn đọc tiếp.
          </h1>
          <p className="page-copy max-w-xl">
            Truyện ngắn, chap nhanh, hook mạnh — đọc trong vài phút rảnh.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-cyan-300 px-5 text-[0.95rem] font-black uppercase tracking-[0.12em] text-zinc-950 shadow-[0_14px_30px_rgba(103,232,249,0.18)] transition hover:bg-cyan-200"
            href="/swipe"
          >
            Lướt ngay
          </Link>
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] px-5 text-[0.95rem] font-black uppercase tracking-[0.12em] text-zinc-100 transition hover:border-white/20 hover:bg-white/[0.08]"
            href="/discover"
          >
            Khám phá truyện
          </Link>
        </div>

        <div
          aria-hidden="true"
          className="grid grid-cols-3 gap-2 pt-1 text-[0.55rem] uppercase tracking-[0.22em] text-zinc-500"
        >
          <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-2 text-center">
            Hook mạnh
          </span>
          <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-2 text-center">
            Chap ngắn
          </span>
          <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-2 text-center">
            Lướt nhanh
          </span>
        </div>
      </div>
    </section>
  );
}
