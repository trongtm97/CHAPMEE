import Link from "next/link";
import { UtilityStarIcon } from "@/components/utilities/UtilityStarIcon";
import { UTILITY_ITEMS } from "@/lib/utilities/utilities-hub";

export function DiscoverUtilitiesSection() {
  return (
    <section aria-labelledby="discover-utilities" className="space-y-2.5">
      <div className="flex items-end justify-between gap-3">
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="text-emerald-400">
            <UtilityStarIcon className="size-4" />
          </span>
          <h2 className="text-base font-bold text-white md:text-lg" id="discover-utilities">
            Tiện ích
          </h2>
        </div>
        <Link className="text-xs font-bold text-cyan-200 hover:text-cyan-100" href="/tien-ich">
          Xem tất cả →
        </Link>
      </div>
      <div className="max-h-[min(22rem,52vh)] overflow-y-auto overscroll-y-contain pr-0.5 md:max-h-none md:overflow-visible">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 md:gap-2.5">
        {UTILITY_ITEMS.map((item) => {
          const isFeatured = item.id === "boi-tinh-yeu";
          return (
            <Link
              className={`tap-highlight flex min-h-[4.5rem] flex-col justify-between rounded-xl border p-2.5 transition ${
                isFeatured
                  ? "border-rose-400/45 bg-gradient-to-br from-rose-500/12 via-rose-500/8 to-pink-500/5 hover:border-rose-300/55"
                  : "border-white/10 bg-[var(--surface-soft)] hover:border-cyan-300/30"
              }`}
              href={item.href}
              key={item.href}
            >
              <span aria-hidden="true" className="text-base leading-none">
                {item.icon}
              </span>
              <div className="min-w-0 pt-1">
                <p
                  className={`text-[13px] font-black leading-tight ${
                    isFeatured ? "text-rose-50" : "text-zinc-50"
                  }`}
                >
                  {item.title}
                </p>
                <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-zinc-400">
                  {item.description}
                </p>
              </div>
            </Link>
          );
        })}
        </div>
      </div>
    </section>
  );
}
