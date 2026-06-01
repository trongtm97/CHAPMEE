import Link from "next/link";
import type { DiscoverTaxonomyChipSection } from "@/lib/discovery/types";

type TaxonomyChipSectionProps = {
  section: DiscoverTaxonomyChipSection;
  className?: string;
};

export function TaxonomyChipSection({ section, className = "" }: TaxonomyChipSectionProps) {
  if (section.terms.length === 0) {
    return null;
  }

  return (
    <section className={`space-y-2.5 ${className}`.trim()}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold tracking-[0.01em] text-white">{section.title}</h2>
        <Link
          className="shrink-0 text-[11px] font-semibold text-cyan-200/90 hover:text-cyan-100"
          href={section.seeAllHref}
        >
          Xem tất cả
        </Link>
      </div>
      <div className="no-scrollbar -mx-4 overflow-x-auto px-4 md:mx-0 md:overflow-visible md:px-0">
        <div className="flex min-w-max gap-2 pb-0.5 md:min-w-0 md:flex-wrap">
          {section.terms.map((term) => (
            <Link
              className="tap-highlight whitespace-nowrap rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-semibold text-zinc-200 transition hover:border-cyan-300/35 hover:text-cyan-100"
              href={term.href}
              key={term.id}
            >
              {term.name}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
