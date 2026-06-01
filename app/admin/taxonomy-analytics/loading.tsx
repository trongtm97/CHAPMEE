export default function AdminTaxonomyAnalyticsLoading() {
  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <div className="h-4 w-48 animate-pulse rounded bg-white/10" />
        <div className="h-8 w-72 animate-pulse rounded bg-white/10" />
        <div className="h-4 w-[36rem] animate-pulse rounded bg-white/10" />
      </div>

      <div className="h-20 animate-pulse rounded-xl border border-white/10 bg-[var(--surface)]" />
      <div className="h-44 animate-pulse rounded-xl border border-white/10 bg-[var(--surface)]" />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div
            key={idx}
            className="h-28 animate-pulse rounded-xl border border-white/10 bg-[var(--surface)]"
          />
        ))}
      </div>

      {Array.from({ length: 5 }).map((_, idx) => (
        <div
          key={idx}
          className="h-64 animate-pulse rounded-xl border border-white/10 bg-[var(--surface)]"
        />
      ))}
    </section>
  );
}
