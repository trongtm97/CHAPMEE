import Link from "next/link";

import { getUtilityItemsByGroup } from "@/lib/utilities/utilities-hub";

import { UTILITIES_TAGLINE } from "@/lib/utilities/constants";

export function UtilitiesHubPage() {
  const groupedItems = getUtilityItemsByGroup();
  const totalTools = groupedItems.reduce((count, section) => count + section.items.length, 0);

  return (
    <div className="space-y-6 sm:space-y-8">
      <header className="rounded-2xl border border-white/10 bg-zinc-950/70 p-5 sm:p-7">
        <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-cyan-300/80">ChapMee</p>
        <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">Tiện ích</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400 sm:text-base">
          {UTILITIES_TAGLINE} Chọn công cụ ở thanh bên hoặc thẻ bên dưới — sẽ bổ sung thêm nhiều
          tiện ích theo thời gian.
        </p>
        <p className="mt-4 text-xs font-semibold text-zinc-500">{totalTools} công cụ hiện có</p>
      </header>

      {groupedItems.map(({ group, items }) => (
        <section aria-labelledby={`utilities-group-${group.id}`} key={group.id}>
          <h2
            className="mb-3 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-zinc-500"
            id={`utilities-group-${group.id}`}
          >
            {group.label}
          </h2>
          <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
              <Link
                className="group rounded-xl border border-white/10 bg-zinc-950/60 p-4 transition hover:border-cyan-300/30 hover:bg-zinc-950/90"
                href={item.href}
                key={item.id}
              >
                <span
                  aria-hidden="true"
                  className="inline-flex size-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-lg leading-none transition group-hover:border-cyan-300/25"
                >
                  {item.icon}
                </span>
                <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.08em] text-zinc-500">
                  {item.kicker}
                </p>
                <p className="mt-0.5 text-base font-bold text-white">{item.title}</p>
                <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-zinc-400">
                  {item.description}
                </p>
                <p className="mt-3 text-xs font-semibold text-cyan-200/90 group-hover:text-cyan-100">
                  Mở công cụ →
                </p>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
