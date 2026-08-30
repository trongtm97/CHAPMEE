import Link from "next/link";
import { HotBadge } from "@/components/common/HotBadge";
import { ArticleNavIcon } from "@/components/navigation/AppNavIcons";
import { UtilityStarIcon } from "@/components/utilities/UtilityStarIcon";
import { DISCOVER_SHORTCUT_ITEMS } from "@/lib/discover/discover-shortcuts";

type DiscoverQuickAccessGridProps = {
  hideHeading?: boolean;
};

export function DiscoverQuickAccessGrid({ hideHeading = false }: DiscoverQuickAccessGridProps) {
  return (
    <section aria-labelledby="discover-shortcuts" className="space-y-2.5">
      {hideHeading ? null : (
        <h2 className="text-base font-bold text-white md:text-lg" id="discover-shortcuts">
          Lối tắt nhanh
        </h2>
      )}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 md:gap-2.5">
        {DISCOVER_SHORTCUT_ITEMS.map((item) => (
          <Link
            className={`tap-highlight flex min-h-[4.5rem] flex-col justify-between rounded-xl border p-2.5 transition ${
              item.highlight
                ? "border-orange-400/45 bg-gradient-to-br from-orange-500/12 via-orange-500/8 to-amber-500/5 hover:border-orange-300/55 hover:from-orange-500/18"
                : "border-white/10 bg-[var(--surface-soft)] hover:border-cyan-300/30"
            }`}
            href={item.href}
            key={item.href}
          >
            {item.icon === "article" ? (
              <span aria-hidden="true" className="text-cyan-300">
                <ArticleNavIcon className="size-4" />
              </span>
            ) : item.icon === "utility-star" ? (
              <span aria-hidden="true" className="text-emerald-400">
                <UtilityStarIcon className="size-4" />
              </span>
            ) : (
              <span aria-hidden="true" className="text-base leading-none">
                {item.icon}
              </span>
            )}
            <div className="min-w-0 pt-1">
              <div className="inline-flex max-w-full items-center gap-2">
                <p
                  className={`text-[13px] font-black leading-tight ${
                    item.highlight ? "text-orange-50" : "text-zinc-50"
                  }`}
                >
                  {item.title}
                </p>
                {item.hot ? <HotBadge variant="corner" /> : null}
              </div>
              <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-zinc-400">{item.subtitle}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
