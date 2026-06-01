import { MonetizationKpiSkeleton } from "@/components/studio/monetization/monetization-ui";
import { STUDIO_PAGE_WIDTH_CLASS } from "@/lib/studio/constants";

export default function StudioMonetizationLoading() {
  return (
    <section className={`${STUDIO_PAGE_WIDTH_CLASS} space-y-6 pb-20`}>
      <div className="animate-pulse rounded-2xl border border-white/10 bg-zinc-950/50 p-5">
        <div className="h-4 w-32 rounded bg-white/10" />
        <div className="mt-3 h-8 w-48 rounded bg-white/10" />
        <div className="mt-2 h-4 w-full max-w-lg rounded bg-white/5" />
      </div>
      <div className="flex gap-2 border-b border-white/10 pb-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div className="h-9 w-24 animate-pulse rounded-lg bg-white/5" key={i} />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <MonetizationKpiSkeleton key={i} />
        ))}
      </div>
    </section>
  );
}
