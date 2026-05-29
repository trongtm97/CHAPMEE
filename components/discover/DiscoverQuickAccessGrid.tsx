import Link from "next/link";

const items = [
  {
    href: "/truyen",
    title: "Danh mục truyện",
    subtitle: "Xem toàn bộ kho truyện",
    icon: "📚"
  },
  {
    href: "/bang-xep-hang",
    title: "Bảng xếp hạng",
    subtitle: "Top truyện hôm nay",
    icon: "🏆"
  },
  {
    href: "/truyen?sort=new&page=1",
    title: "Truyện mới",
    subtitle: "Vừa đăng / vừa cập nhật",
    icon: "✨"
  },
  {
    href: "/truyen?sort=quick&page=1",
    title: "Đọc nhanh",
    subtitle: "Truyện ngắn, dễ đọc",
    icon: "⚡"
  }
] as const;

export function DiscoverQuickAccessGrid() {
  return (
    <section className="space-y-2.5">
      <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-zinc-400">Khám phá nhanh</h2>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
        {items.map((item) => (
          <Link
            className="tap-highlight flex min-h-[4.5rem] flex-col justify-between rounded-xl border border-white/10 bg-[var(--surface-soft)] p-2.5 transition hover:border-cyan-300/30"
            href={item.href}
            key={item.href}
          >
            <span aria-hidden="true" className="text-base">
              {item.icon}
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-black leading-tight text-zinc-50">{item.title}</p>
              <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-zinc-400">{item.subtitle}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
