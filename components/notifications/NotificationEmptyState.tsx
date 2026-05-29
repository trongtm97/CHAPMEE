import Link from "next/link";

export function NotificationEmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-center">
      <p className="text-sm font-semibold text-zinc-200">Chưa có thông báo</p>
      <p className="mx-auto mt-2 max-w-xs text-xs leading-5 text-zinc-500">
        Khi có cập nhật từ truyện, tác giả hoặc ví coin, bạn sẽ thấy tại đây.
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <Link
          className="inline-flex min-h-9 items-center justify-center rounded-full bg-cyan-300/15 px-3 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-300/25"
          href="/discover"
        >
          Khám phá truyện
        </Link>
        <Link
          className="inline-flex min-h-9 items-center justify-center rounded-full border border-white/12 px-3 text-xs font-semibold text-zinc-300 transition hover:border-white/20"
          href="/community"
        >
          Theo dõi tác giả
        </Link>
      </div>
    </div>
  );
}
